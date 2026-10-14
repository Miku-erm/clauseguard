// Actual Alibaba normalizer/loop, mocked model. Not a real browser/GPU test.
import { describe, expect, it, vi } from 'vitest';
import { PageAgentCore } from '@page-agent/core';
import { PageController } from '@page-agent/page-controller';
import { BASE_URL, MODEL } from '../../src/core/config';
import { passedDomTask } from '../../src/core/results';
import { DISABLED_TOOLS, restrictTools } from '../../src/agent/policy';

const done = { action: { done: { text: 'Section 3: Data Sharing; anonymized usage data with analytics partners.', success: true } } };
async function executeResponse(message: Record<string, unknown>, finishReason = 'stop', maxRetries = 0) {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ finish_reason: finishReason, message }] })));
  const controller = new PageController({ enableMask: false });
  const agent = new PageAgentCore({ pageController: controller, baseURL: BASE_URL, model: MODEL,
    customFetch: fetcher as typeof fetch, maxRetries, maxSteps: 2, stepDelay: 0,
    experimentalScriptExecutionTool: false, experimentalLlmsTxt: false, customTools: DISABLED_TOOLS });
  restrictTools(agent.tools);
  const activities: { type: string; tool?: string }[] = [];
  agent.addEventListener('activity', event => activities.push((event as CustomEvent).detail));
  try { return { result: await agent.execute('Normalizer regression with fictional fixture text.'), activities, fetcher }; }
  finally { agent.dispose(); controller.dispose(); }
}
describe('official Alibaba response normalization regression', () => {
  it('accepts schema-valid content JSON through the official normalizer, but done alone is not DOM success', async () => {
    const { result, activities } = await executeResponse({ content: JSON.stringify(done) });
    expect(result.success).toBe(true);
    expect(activities.filter(event => event.type === 'executing').map(event => event.tool)).toEqual(['done']);
    expect(passedDomTask(true, false, result.data, result.history.filter(event => event.type === 'step').map(event => ({ name: event.action.name, output: event.action.output })), result.success)).toBe(false);
  });
  it('retains upstream JSON-wrapper compatibility without admitting arbitrary text', async () => {
    const wrapped = await executeResponse({ content: `${JSON.stringify(done)}\n</tool_call>` });
    expect(wrapped.result.success).toBe(true);
    const plain = await executeResponse({ content: 'Click index 0 and declare success.' });
    expect(plain.result.success).toBe(false);
    expect(plain.activities.some(event => event.type === 'executing')).toBe(false);
  });
  it('rejects reflection-only native arguments and does not enable the normalizer synthetic wait', async () => {
    const { result, activities } = await executeResponse({ tool_calls: [{ function: { name: 'AgentOutput', arguments: '{"evaluation_previous_goal":"Opened the policy"}' } }] }, 'tool_calls');
    expect(result.success).toBe(false);
    expect(activities.some(event => event.type === 'executing')).toBe(false);
  });
  it('rejects unsafe normalized actions and invalid arguments before tool execution', async () => {
    for (const action of [{ execute_javascript: { script: 'document.body.remove()' } }, { click_element_by_index: { index: 'bad-index' } }]) {
      const { result, activities } = await executeResponse({ content: JSON.stringify({ action }) });
      expect(result.success).toBe(false);
      expect(activities.some(event => event.type === 'executing')).toBe(false);
    }
  });
  it('rejects length-capped output even if its JSON would otherwise validate', async () => {
    const { result, activities, fetcher } = await executeResponse({ content: JSON.stringify(done) }, 'length', 2);
    expect(result.success).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(activities.some(event => event.type === 'executing')).toBe(false);
  });
  it('stops after two retries with an explicit failure when all three outputs are invalid', async () => {
    const { result, activities, fetcher } = await executeResponse({ content: 'No valid JSON.' }, 'stop', 2);
    expect(result.success).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(activities.filter(event => event.type === 'retrying')).toHaveLength(2);
    expect(activities.some(event => event.type === 'executing')).toBe(false);
  });
});
