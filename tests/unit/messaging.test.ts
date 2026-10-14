import { describe, expect, it } from 'vitest';
import { FIXTURE_URL } from '../../src/core/config';
import { authorizeSession, isPopupSender, popupCommandSchema, runCommandSchema, validateLlmBody, type Session } from '../../src/extension/protocol';

const id = '025fbbe3-6c62-4dd9-a24c-0f840a57a606';
const runtimeId = 'test-extension';
const sender = { id: runtimeId, tab: { id: 10 }, frameId: 0, url: FIXTURE_URL, documentId: 'document-1' };
const session = (): Session => ({ id, tabId: 10, expiresAt: 10000, requests: 0, busy: false, documentId: 'document-1' });
describe('extension session boundary', () => {
  it('validates message types and rejects forwarding commands', () => {
    expect(popupCommandSchema.safeParse({ type: 'START_TEST' }).success).toBe(true);
    expect(popupCommandSchema.safeParse({ type: 'FETCH', url: 'http://localhost' }).success).toBe(false);
    expect(popupCommandSchema.safeParse({ type: 'START_TEST', task: 'Purchase something' }).success).toBe(false);
    expect(runCommandSchema.safeParse({ type: 'RUN_AGENT', sessionId: id }).success).toBe(true);
    expect(runCommandSchema.safeParse({ type: 'RUN_AGENT', sessionId: 'guessed' }).success).toBe(false);
  });
  it('only lets the packaged popup initiate operations', () => {
    const popupUrl = `chrome-extension://${runtimeId}/popup.html`;
    expect(isPopupSender({ id: runtimeId, url: popupUrl }, runtimeId, popupUrl)).toBe(true);
    expect(isPopupSender(sender, runtimeId, popupUrl)).toBe(false);
    expect(isPopupSender({ id: 'other', url: popupUrl }, runtimeId, popupUrl)).toBe(false);
  });
  it('binds requests to authorized tab, top frame, document, origin, budget and lifetime', () => {
    expect(authorizeSession(session(), sender, runtimeId, 1)).toBeTruthy();
    for (const mutation of [{ id: 'other' }, { tab: { id: 11 } }, { frameId: 1 }, { url: 'https://evil.example' },
      { documentId: 'document-2' }, { origin: 'https://evil.example' }]) {
      expect(() => authorizeSession(session(), { ...sender, ...mutation }, runtimeId, 1)).toThrow();
    }
    expect(() => authorizeSession(undefined, sender, runtimeId, 1)).toThrow();
    expect(() => authorizeSession(session(), sender, runtimeId, 10000)).toThrow();
    expect(() => authorizeSession({ ...session(), requests: 14 }, sender, runtimeId, 1)).toThrow();
    expect(() => authorizeSession({ ...session(), busy: true }, sender, runtimeId, 1)).toThrow();
  });
  it('does not accept arbitrary URL, model, streaming, or tool forwarding', () => {
    expect(() => validateLlmBody(JSON.stringify({ url: 'https://example.com', model: 'other' }))).toThrow();
    expect(() => validateLlmBody('{invalid json')).toThrow();
  });
});
