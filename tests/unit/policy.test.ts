import { describe, expect, it } from 'vitest';
import { PageAgentCore } from '@page-agent/core';
import { PageController } from '@page-agent/page-controller';
import { BASE_URL, FIXTURE_URL, MODEL } from '../../src/core/config';
import { assertClickIndex, assertClickTarget, DISABLED_TOOLS, restrictTools } from '../../src/agent/policy';
import { passedDomTask } from '../../src/core/results';

const target = { tag: 'BUTTON', id: 'open-policy', type: 'button', inForm: false, connected: true, approved: true, sameElement: true, disabled: false };
describe('permitted agent actions', () => {
  it('removes dangerous and unknown tools from the actual Alibaba registry', () => {
    const controller = new PageController();
    const agent = new PageAgentCore({ pageController: controller, baseURL: BASE_URL, model: MODEL,
      experimentalScriptExecutionTool: false, customTools: DISABLED_TOOLS });
    restrictTools(agent.tools);
    expect([...agent.tools.keys()].sort()).toEqual(['click_element_by_index', 'done', 'scroll']);
    expect(agent.config.experimentalScriptExecutionTool).toBe(false);
    agent.dispose(); controller.dispose();
  });
  it('only permits the original explicitly approved non-form fixture button', () => {
    expect(() => assertClickTarget(FIXTURE_URL, target)).not.toThrow();
    for (const change of [{ tag: 'A' }, { id: 'purchase' }, { type: 'submit' }, { inForm: true }, { disabled: true },
      { connected: false }, { approved: false }, { sameElement: false }]) {
      expect(() => assertClickTarget(FIXTURE_URL, { ...target, ...change })).toThrow();
    }
    expect(() => assertClickTarget('https://example.com', target)).toThrow();
  });
  it('validates the real extracted DOM index and rejects invalid tool arguments', () => {
    const state = '[4]<button id=open-policy type=button>Gizlilik Politikasını Göster</button>';
    expect(assertClickIndex(4, state)).toBe(4);
    for (const invalid of [0, -1, 1.2, '4', {}, null]) expect(() => assertClickIndex(invalid, state)).toThrow();
    expect(() => assertClickIndex(4, '')).toThrow();
  });
  it('rejects response-only success and false DOM completion', () => {
    const data = 'Section 3: Data Sharing. We may share anonymized usage data with analytics partners.';
    expect(passedDomTask(true, true, data, [{ name: 'click_element_by_index', output: 'Clicked' }, { name: 'done', output: 'Done' }], true)).toBe(true);
    expect(passedDomTask(true, false, data, [{ name: 'done', output: 'Done' }], true)).toBe(false);
    expect(passedDomTask(true, true, data, [{ name: 'done', output: 'Done' }], true)).toBe(false);
    expect(passedDomTask(true, true, data, [{ name: 'click_element_by_index', output: '❌ Blocked' }, { name: 'done', output: 'Done' }], true)).toBe(false);
  });
});
