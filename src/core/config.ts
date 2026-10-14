import { z } from 'zod/v4';

export const MODEL = 'qwen3.5:9b-q4_K_M' as const;
export const BASE_URL = 'http://127.0.0.1:11434/v1' as const;
export const OLLAMA_ORIGIN = 'http://127.0.0.1:11434' as const;
export const FIXTURE_URL = 'http://127.0.0.1:4173/fixture.html' as const;
export const CONTEXT = 8192;
export const TASK = 'Find and open the privacy policy section, then identify the section containing the data-sharing clause. Return the section number, heading, and a short quotation from that clause. Finish only after the hidden policy is visible.';

export function validateProviderUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '11434' ||
      url.pathname !== '/v1' || url.search || url.hash || url.username || url.password) {
    throw new Error('Only the exact IPv4 loopback Ollama /v1 endpoint is allowed');
  }
  return url.href;
}

export const configSchema = z.strictObject({
  baseURL: z.string().refine(value => { try { validateProviderUrl(value); return true; } catch { return false; } }),
  model: z.literal(MODEL),
  context: z.literal(CONTEXT),
});
export const providerConfig = configSchema.parse({ baseURL: BASE_URL, model: MODEL, context: CONTEXT });
export function isFixtureUrl(value?: string): boolean { return value === FIXTURE_URL; }
