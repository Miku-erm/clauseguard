import { describe, expect, it, vi } from 'vitest';
import { extractDocuments } from '../../src/extraction/dom';
import { runReflex, transition, type DiscoveryReport } from '../../src/reflex/engine';
import { fixtureExpectation } from '../../src/extraction/fixture-expectations';
import { authorizeSession } from '../../src/extension/protocol';
import { assertDiscoveryTarget } from '../../src/agent/discovery-agent';
import { scanCommandSchema } from '../../src/extension/scan-protocol';
import { webcrypto } from 'node:crypto';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
const id = '025fbbe3-6c62-4dd9-a24c-0f840a57a606'; const url = 'http://127.0.0.1:4173/p1/hidden.html';
const report: DiscoveryReport = { success: true, data: 'Opened', durationMs: 1, toolCalls: 2, failedToolCalls: 0, retries: 0, steps: [], activities: [], errors: [], allowedTools: ['done', 'click_element_by_index', 'scroll'] };
describe('bounded deterministic reflex routing (discovery mocked here only)', () => {
  it('FAST extraction never calls discovery and records valid states', async () => {
    const source = new DOMParser().parseFromString('<main><h1>Privacy Policy</h1><p>We only collect anonymized usage events when consent has been given.</p></main>', 'text/html');
    const discover = vi.fn(); const result = await runReflex(id, { expectedUrl: url, currentUrl: async () => url, extract: () => extractDocuments(source, 'https://example.test/privacy'), canDiscover: () => true, discover });
    expect(discover).not.toHaveBeenCalled(); expect(result.path).toBe('FAST'); expect(result.state).toBe('READY'); expect(result.providerCalls).toBe(0); expect(result.states).toEqual(['IDLE', 'INSPECTING', 'EXTRACTING', 'READY']);
  });
  it('SLOW performs one discovery and re-extracts actual changed DOM', async () => {
    const source = new DOMParser().parseFromString('<main><h1>Privacy Policy</h1><section hidden><h2>Sharing</h2><p>Data is shared only where optional analytics consent was provided.</p></section></main>', 'text/html');
    const extract = vi.fn(() => extractDocuments(source, 'https://example.test/privacy'));
    const discover = vi.fn(async () => { source.querySelector('section')!.hidden = false; return report; });
    const result = await runReflex(id, { expectedUrl: url, currentUrl: async () => url, extract, discover, canDiscover: () => true });
    expect(result.path).toBe('SLOW'); expect(result.state).toBe('READY'); expect(discover).toHaveBeenCalledTimes(1); expect(extract).toHaveBeenCalledTimes(2); expect(result.documents[0]!.sourceChunks.at(-1)!.text).toContain('consent');
  });
  it('refuses invalid transitions and leaves insufficient pages honest', async () => {
    expect(() => transition('READY', 'DISCOVERING')).toThrow(); expect(() => transition('IDLE', 'READY')).toThrow();
    const result = await runReflex(id, { expectedUrl: url, currentUrl: async () => url, extract: async () => ({ documents: [], warnings: ['No policy'], ambiguous: false }), canDiscover: () => false });
    expect(result.state).toBe('INSUFFICIENT'); expect(result.agentInvoked).toBe(false);
  });
  it('handles extraction failure, cancellation, timeout and stale navigation without retries', async () => {
    const basic = { expectedUrl: url, currentUrl: async () => url, canDiscover: () => false, extract: async () => { throw new Error('Extraction failed'); } };
    expect((await runReflex(id, basic)).state).toBe('FAILED');
    const controller = new AbortController(); controller.abort(new Error('Cancelled'));
    expect((await runReflex(id, { ...basic, signal: controller.signal })).warnings.join()).toContain('Cancelled');
    expect((await runReflex(id, { ...basic, currentUrl: async () => 'https://elsewhere.test' })).warnings.join()).toContain('Stale page');
    const timeout = await runReflex(id, { ...basic, timeoutMs: 5, extract: () => new Promise(() => {}) }); expect(timeout.warnings.join()).toContain('deadline');
  });
  it('bounds discovery failure and re-extraction without claiming success', async () => {
    const source = new DOMParser().parseFromString('<main><h1>Privacy Policy</h1><section hidden><h2>Sharing</h2><p>A clause remains hidden until its approved control is opened.</p></section></main>', 'text/html');
    const discover = vi.fn(async () => ({ ...report, success: false }));
    const result = await runReflex(id, { expectedUrl: url, currentUrl: async () => url, canDiscover: () => true, extract: () => extractDocuments(source, url), discover });
    expect(result.state).toBe('INSUFFICIENT'); expect(result.warnings.join()).toContain('did not complete'); expect(discover).toHaveBeenCalledTimes(1);
  });
  it('does not grant arbitrary pages or fixture data attributes an LLM session', () => {
    const session = { id, tabId: 10, expiresAt: 10000, requests: 0, busy: false, documentId: 'doc', authorizedUrl: url };
    const sender = { id: 'ext', tab: { id: 10 }, frameId: 0, url, documentId: 'doc', origin: 'http://127.0.0.1:4173' };
    expect(authorizeSession(session, sender, 'ext', 1)).toBeTruthy();
    for (const altered of [{ url: url.replace('hidden', 'visible') }, { documentId: 'stale' }, { frameId: 1 }, { origin: 'https://evil.test' }]) expect(() => authorizeSession(session, { ...sender, ...altered }, 'ext', 1)).toThrow();
    expect(() => authorizeSession({ ...session, authorizedUrl: 'https://example.test/privacy' }, { ...sender, url: 'https://example.test/privacy' }, 'ext', 1)).toThrow();
    expect(fixtureExpectation(`${url}?spoof=true`)).toBeUndefined(); expect(scanCommandSchema.safeParse({ type: 'DISCOVER_DOCUMENT', sessionId: id, expectedUrl: url, script: 'alert(1)' }).success).toBe(false);
  });
  it('rejects removed, replaced, form-contained, disabled and unapproved discovery targets', () => {
    document.body.innerHTML = '<button type="button" id="open-policy" data-clauseguard-approved="open-policy"></button>';
    const button = document.querySelector('button')!; expect(() => assertDiscoveryTarget(url, button.id, button, button)).not.toThrow();
    expect(() => assertDiscoveryTarget('https://evil.test', button.id, button, button)).toThrow(); button.disabled = true; expect(() => assertDiscoveryTarget(url, button.id, button, button)).toThrow(); button.disabled = false;
    const form = document.createElement('form'); document.body.append(form); form.append(button); expect(() => assertDiscoveryTarget(url, button.id, button, button)).toThrow();
    document.body.append(button); const replacement = button.cloneNode(true) as HTMLButtonElement; button.replaceWith(replacement); expect(() => assertDiscoveryTarget(url, button.id, replacement, button)).toThrow();
    expect(() => assertDiscoveryTarget(url, button.id, button, button)).toThrow();
  });
});
