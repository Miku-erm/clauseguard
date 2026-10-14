import { CONTEXT, MODEL, OLLAMA_ORIGIN } from '../core/config';

export type Connection = { connected: boolean; detail: string };
export async function modelConnection(fetcher: typeof fetch = fetch): Promise<Connection> {
  try {
    const response = await fetcher(`${OLLAMA_ORIGIN}/api/tags`, { signal: AbortSignal.timeout(4000), redirect: 'error' });
    if (!response.ok) return { connected: false, detail: `Ollama returned HTTP ${response.status}` };
    const body: unknown = await response.json();
    const models = (body as { models?: { name?: string }[] })?.models;
    if (!Array.isArray(models)) return { connected: false, detail: 'Invalid Ollama model inventory' };
    return models.some(model => model.name === MODEL)
      ? { connected: true, detail: `${MODEL} available locally` }
      : { connected: false, detail: `Authorized model missing: ${MODEL}` };
  } catch { return { connected: false, detail: 'Ollama runtime missing, stopped, or unreachable on loopback' }; }
}

export async function prepareGpuModel(fetcher: typeof fetch = fetch): Promise<void> {
  const connection = await modelConnection(fetcher);
  if (!connection.connected) throw new Error(connection.detail);
  const response = await fetcher(`${OLLAMA_ORIGIN}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error',
    body: JSON.stringify({ model: MODEL, stream: false, think: false, keep_alive: '10m', options: { num_ctx: CONTEXT } }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Model loading failed: HTTP ${response.status}`);
  const residentResponse = await fetcher(`${OLLAMA_ORIGIN}/api/ps`, { redirect: 'error', signal: AbortSignal.timeout(4000) });
  if (!residentResponse.ok) throw new Error('Could not verify model residency');
  const resident = await residentResponse.json() as { models?: { name: string; context_length: number; size: number; size_vram: number }[] };
  const model = resident.models?.find(model => model.name === MODEL);
  if (!model || model.context_length !== CONTEXT) throw new Error('Operational context not verified at 8192');
  if (!model.size_vram || model.size_vram < model.size) throw new Error('CPU or mixed residency detected. Rerun GPU diagnostics; P0 requires full GPU for the fixture.');
}
