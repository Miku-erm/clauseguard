import { browser } from 'wxt/browser';
import { BASE_URL } from '../core/config';

interface Reply { requestId: string; status?: number; body?: string; error?: string }
export function createLocalFetch(sessionId: string): { fetch: typeof fetch; close: () => void } {
  const port = browser.runtime.connect({ name: `clauseguard-llm:${sessionId}` });
  const pending = new Map<string, { resolve: (response: Response) => void; reject: (error: Error) => void; cleanup: () => void }>();
  port.onMessage.addListener((reply: Reply) => {
    const request = pending.get(reply.requestId);
    if (!request) return;
    pending.delete(reply.requestId); request.cleanup();
    if (reply.error) request.reject(new Error(reply.error));
    else request.resolve(new Response(reply.body ?? '', { status: reply.status ?? 502, headers: { 'Content-Type': 'application/json' } }));
  });
  port.onDisconnect.addListener(() => {
    for (const request of pending.values()) { request.cleanup(); request.reject(new Error('Local provider session disconnected')); }
    pending.clear();
  });
  const fetcher: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== `${BASE_URL}/chat/completions` || init?.method !== 'POST' || typeof init.body !== 'string') throw new Error('Unsupported Page Agent fetch request');
    const body = JSON.parse(init.body) as { stream?: boolean };
    if (body.stream !== false) throw new Error('Streaming is unsupported by the installed Page Agent client; refusing instead of breaking SSE');
    init.signal?.throwIfAborted();
    const requestId = crypto.randomUUID();
    return new Promise<Response>((resolve, reject) => {
      const abort = () => { pending.delete(requestId); cleanup(); port.postMessage({ type: 'CANCEL', requestId }); reject(new DOMException('Aborted', 'AbortError')); };
      const timeout = setTimeout(() => { pending.delete(requestId); cleanup(); port.postMessage({ type: 'CANCEL', requestId }); reject(new Error('Local provider request timed out')); }, 90_000);
      const cleanup = () => { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); };
      pending.set(requestId, { resolve, reject, cleanup });
      init.signal?.addEventListener('abort', abort, { once: true });
      port.postMessage({ requestId, body: init.body });
    });
  };
  return { fetch: fetcher, close: () => port.disconnect() };
}
