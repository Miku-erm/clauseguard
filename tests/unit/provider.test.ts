import { describe, expect, it, vi } from 'vitest';
import { LLM } from '@page-agent/llms';
import { z } from 'zod/v4';
import { BASE_URL, MODEL } from '../../src/core/config';
import { modelConnection, prepareGpuModel } from '../../src/llm/provider';
import { localPageAgentRequest } from '../../src/llm/page-agent-config';
import { validateLlmBody } from '../../src/extension/protocol';

function mockFetch(response: unknown, status = 200): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(response), { status })) as unknown as typeof fetch;
}
describe('mocked provider failure boundaries (not real integration)', () => {
  it('adapts the actual Alibaba Qwen request patch without relaxing bridge validation', async () => {
    let captured = '';
    const llm = new LLM({ baseURL: BASE_URL, model: MODEL, maxRetries: 0, transformRequestBody: localPageAgentRequest,
      customFetch: (async (_input, init) => {
        captured = String(init?.body);
        return new Response(JSON.stringify({ choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [{ function: { name: 'AgentOutput', arguments: '{"action":{"click_element_by_index":{"index":0}}}' } }] } }] }));
      }) as typeof fetch });
    await llm.invoke([{ role: 'system', content: 'Test instructions' }, { role: 'user', content: 'Test task' }],
      { AgentOutput: { inputSchema: z.object({ evaluation_previous_goal: z.string().optional(), memory: z.string().optional(), next_goal: z.string().optional(),
        action: z.object({ click_element_by_index: z.object({ index: z.int().min(0) }) }) }), execute: async () => 'ok' } },
      new AbortController().signal, { toolChoiceName: 'AgentOutput' });
    expect(JSON.parse(captured)).not.toHaveProperty('enable_thinking');
    expect(JSON.parse(captured).response_format.json_schema.schema).toEqual({ ...JSON.parse(captured).tools[0].function.parameters,
      required: ['evaluation_previous_goal', 'memory', 'next_goal', 'action'] });
    expect(() => validateLlmBody(captured)).not.toThrow();
    expect(() => validateLlmBody(JSON.stringify({ ...JSON.parse(captured), stream: true }))).toThrow();
    expect(() => validateLlmBody(JSON.stringify({ ...JSON.parse(captured), url: 'https://other.example' }))).toThrow();
    const mismatched = JSON.parse(captured);
    mismatched.response_format.json_schema.schema = { type: 'object' };
    expect(() => validateLlmBody(JSON.stringify(mismatched))).toThrow('exactly match');
    const incomplete = JSON.parse(captured);
    incomplete.tools[0].function.parameters.required = [];
    incomplete.response_format.json_schema.schema.required = [];
    expect(() => validateLlmBody(JSON.stringify(incomplete))).toThrow('require an action');
  });
  it('reports connection failure without trying another provider', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Connection refused'); }) as unknown as typeof fetch;
    expect((await modelConnection(fetcher)).connected).toBe(false);
    expect(await modelConnection(mockFetch({ models: [{ name: 'different' }] }))).toEqual({ connected: false, detail: `Authorized model missing: ${MODEL}` });
    expect((await modelConnection(mockFetch({}, 503))).connected).toBe(false);
  });
  it('requires the authorized model', async () => {
    expect((await modelConnection(mockFetch({ models: [{ name: MODEL }] }))).connected).toBe(true);
    expect((await modelConnection(mockFetch({ models: 'invalid' }))).connected).toBe(false);
  });
  it('rejects CPU-only and mixed operational residency', async () => {
    for (const sizeVram of [0, 800]) {
      const fetcher = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: MODEL }] })))
        .mockResolvedValueOnce(new Response('{}'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: MODEL, context_length: 8192, size: 1000, size_vram: sizeVram }] }))) as unknown as typeof fetch;
      await expect(prepareGpuModel(fetcher)).rejects.toThrow('CPU or mixed');
    }
  });
  it('rejects model load failure', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [{ name: MODEL }] })))
      .mockResolvedValueOnce(new Response('{}', { status: 500 })) as unknown as typeof fetch;
    await expect(prepareGpuModel(fetcher)).rejects.toThrow('Model loading failed');
  });
  it('uses Alibaba parsing to reject malformed and invalid tool arguments', async () => {
    const execute = vi.fn(async () => 'ok');
    for (const args of ['{malformed', '{"index":"not-a-number"}']) {
      const llm = new LLM({ baseURL: BASE_URL, model: MODEL, maxRetries: 0,
        customFetch: mockFetch({ choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [{ function: { name: 'Click', arguments: args } }] } }] }) });
      await expect(llm.invoke([{ role: 'user', content: 'Fixture test' }], { Click: { inputSchema: z.object({ index: z.int().min(0) }), execute } }, new AbortController().signal)).rejects.toMatchObject({ type: 'invalid_tool_args' });
    }
    expect(execute).not.toHaveBeenCalled();
  });
  it('recovers an invalid response through Alibaba retry without executing invalid arguments', async () => {
    const execute = vi.fn(async () => 'opened');
    const argumentsQueue = ['{"index":"invalid"}', '{"index":0}'];
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{
      finish_reason: 'tool_calls', message: { tool_calls: [{ function: { name: 'Click', arguments: argumentsQueue.shift() } }] },
    }] }))) as unknown as typeof fetch;
    const llm = new LLM({ baseURL: BASE_URL, model: MODEL, maxRetries: 1, customFetch: fetcher });
    const result = await llm.invoke([{ role: 'user', content: 'Open fixture' }],
      { Click: { inputSchema: z.object({ index: z.int().min(0) }), execute } }, new AbortController().signal);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledExactlyOnceWith({ index: 0 });
    expect(result.toolResult).toBe('opened');
  });
  it('uses Alibaba parsing to reject failed or truncated model responses', async () => {
    for (const response of [{ choices: [] }, { choices: [{ finish_reason: 'length' }] }, { choices: [{ finish_reason: 'stop', message: { content: 'Only text' } }] }]) {
      const llm = new LLM({ baseURL: BASE_URL, model: MODEL, maxRetries: 0, customFetch: mockFetch(response) });
      await expect(llm.invoke([], {}, new AbortController().signal)).rejects.toThrow();
    }
    const llm = new LLM({ baseURL: BASE_URL, model: MODEL, maxRetries: 0, customFetch: mockFetch({}, 500) });
    await expect(llm.invoke([], {}, new AbortController().signal)).rejects.toMatchObject({ type: 'server_error' });
  });
});
