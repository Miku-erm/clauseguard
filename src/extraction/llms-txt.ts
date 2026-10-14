import { z } from 'zod/v4';
export const llmsDiscoverySchema = z.strictObject({
  status: z.enum(['FOUND', 'MISSING', 'INVALID', 'UNAVAILABLE']), resourceUrl: z.string().url(),
  links: z.array(z.strictObject({ label: z.string().max(200), url: z.string().url().max(2048) })).max(12),
  rejectedLinks: z.number().int().nonnegative(),
});
export type LlmsDiscovery = z.infer<typeof llmsDiscoverySchema>;
const LIMIT = 32 * 1024;
const legalLink = /privacy|terms|subscription|agreement|gizlilik|abonelik|koşul|şart|policy/i;
export function authorizedPolicyUrl(input: string, pageUrl: string): string | undefined {
  try {
    const page = new URL(pageUrl); const target = new URL(input, page);
    if (target.origin !== page.origin || target.username || target.password || target.hash || target.href.length > 2048) return undefined;
    if (target.protocol !== 'https:' && !(target.protocol === 'http:' && target.hostname === '127.0.0.1' && target.port === '4173')) return undefined;
    return target.href;
  } catch { return undefined; }
}
/** Links only. All prose/roles/instructions are discarded, never contractual evidence. */
export function parseLlmsTxt(text: string, pageUrl: string): LlmsDiscovery {
  const resourceUrl = new URL('/llms.txt', pageUrl).href;
  const result: LlmsDiscovery = { status: 'INVALID', resourceUrl, links: [], rejectedLinks: 0 };
  if (new TextEncoder().encode(text).length > LIMIT || !/^#\s+\S/.test(text.replace(/^\uFEFF/, '').trimStart())) return result;
  result.status = 'FOUND'; const seen = new Set<string>();
  for (const line of text.split(/\r?\n/).slice(0, 512)) {
    const match = /^\s*[-*+]\s+\[([^\]\r\n]{1,200})\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/.exec(line);
    if (!match || !legalLink.test(match[1]! + ' ' + match[2]!)) continue;
    const url = authorizedPolicyUrl(match[2]!, resourceUrl);
    if (!url) { result.rejectedLinks++; continue; }
    if (!seen.has(url) && result.links.length < 12) { result.links.push({ label: match[1]!, url }); seen.add(url); }
  }
  return llmsDiscoverySchema.parse(result);
}
export async function discoverLlmsTxt(pageUrl: string, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<LlmsDiscovery> {
  const resourceUrl = new URL('/llms.txt', pageUrl).href;
  const empty: LlmsDiscovery = { status: 'UNAVAILABLE', resourceUrl, links: [], rejectedLinks: 0 };
  if (!authorizedPolicyUrl(resourceUrl, pageUrl)) return empty;
  const bounded = AbortSignal.any([AbortSignal.timeout(4000), ...(signal ? [signal] : [])]);
  try {
    const response = await fetcher(resourceUrl, { signal: bounded, redirect: 'error', credentials: 'omit', cache: 'no-store' });
    if (response.status === 404 || response.status === 410) return { ...empty, status: 'MISSING' };
    if (!response.ok || !response.body || Number(response.headers.get('content-length') ?? 0) > LIMIT) return empty;
    const reader = response.body.getReader(); const parts: Uint8Array[] = []; let length = 0;
    try {
      while (true) {
        bounded.throwIfAborted(); const { done, value } = await reader.read(); if (done) break;
        length += value.byteLength; if (length > LIMIT) return empty; parts.push(value);
      }
    } finally { await reader.cancel(); }
    const body = new Uint8Array(length); let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    return parseLlmsTxt(new TextDecoder('utf-8', { fatal: true }).decode(body), pageUrl);
  } catch { return empty; }
}
