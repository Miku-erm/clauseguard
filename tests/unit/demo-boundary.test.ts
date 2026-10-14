import { describe, expect, it } from 'vitest';
import { isDemoHost, selectDemoFrame } from '../../src/extension/demo-target';
import { uiPage, authorizeUiCommand } from '../../src/extension/ui-protocol';
import { authorizeSession } from '../../src/extension/protocol';
const id = 'a'.repeat(32); const source = 'http://127.0.0.1:4173/demo/flow.html';
describe('restricted real-extension demo route', () => {
  it('requires extension identity and the trusted loopback host', () => {
    const sender = { id, url: `chrome-extension://${id}/demo.html`, tab: { url: source } };
    expect(uiPage(sender, id, `chrome-extension://${id}/`)).toBe('demo');
    expect(uiPage({ ...sender, tab: { url: 'https://unrelated.test/' } }, id, `chrome-extension://${id}/`)).toBeNull();
    expect(isDemoHost('http://127.0.0.1:9999/demo/flow.html')).toBe(false);
    expect(authorizeUiCommand('demo', 'OPEN_POLICY_LINK')).toBe(false);
  });
  it('rejects missing, unrelated and duplicate source frames', () => {
    expect(() => selectDemoFrame([{ frameId: 0, result: { url: 'https://unrelated.test', title: '' } }])).toThrow();
    const frame = { frameId: 3, result: { url: source, title: 'Demo' } };
    expect(selectDemoFrame([frame]).frameId).toBe(3); expect(() => selectDemoFrame([frame, { ...frame, frameId: 4 }])).toThrow();
  });
  it('binds local model access to the selected source frame and document', () => {
    const session = { id: crypto.randomUUID(), tabId: 1, frameId: 3, documentId: 'doc', authorizedUrl: source, expiresAt: Date.now() + 10000, requests: 0, busy: false };
    const sender = { id, tab: { id: 1 }, frameId: 3, documentId: 'doc', url: source, origin: 'http://127.0.0.1:4173' };
    expect(authorizeSession(session, sender, id)).toBe(session);
    expect(() => authorizeSession(session, { ...sender, frameId: 0 }, id)).toThrow();
    expect(() => authorizeSession(session, { ...sender, documentId: 'other' }, id)).toThrow();
  });
});
