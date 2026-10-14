export const DEMO_SOURCE_URLS = new Set(['flow', 'incomplete-flow'].map(name => `http://127.0.0.1:4173/demo/${name}.html`));
export function isDemoHost(url?: string): boolean {
  try { const u = new URL(url!); return u.origin === 'http://127.0.0.1:4173' && (u.pathname.startsWith('/demo/') || u.pathname.startsWith('/__')); } catch { return false; }
}
export function selectDemoFrame(frames: Array<{ frameId: number; documentId?: string; result?: { url: string; title: string } }>) {
  const matches = frames.filter(f => f.result && DEMO_SOURCE_URLS.has(f.result.url));
  if (matches.length !== 1) throw Error('Exactly one approved demonstration document is required');
  return matches[0]!;
}
