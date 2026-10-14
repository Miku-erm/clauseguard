import { describe, expect, it } from 'vitest';
import { buildResponseGrammar } from '../../src/llm/macro-schema';

describe('restricted response grammar', () => {
  it('requires existing reflections without mutating or replacing action definitions', () => {
    const action = { anyOf: [{ type: 'object', properties: { click_element_by_index: { type: 'object' } } }] };
    const parameters = { type: 'object', required: ['action'], properties: { evaluation_previous_goal: { type: 'string' },
      memory: { type: 'string' }, next_goal: { type: 'string' }, action }, additionalProperties: false };
    const grammar = buildResponseGrammar(parameters);
    expect(grammar.required).toEqual(['evaluation_previous_goal', 'memory', 'next_goal', 'action']);
    expect(grammar.properties).toBe(parameters.properties);
    expect(parameters.required).toEqual(['action']);
    expect(grammar.additionalProperties).toBe(false);
  });
  it('rejects an unknown macro instead of allowing a weaker or arbitrary output schema', () => {
    expect(() => buildResponseGrammar({ type: 'object', properties: { action: {} }, required: ['action'] })).toThrow('actual Alibaba reflection');
    expect(() => buildResponseGrammar({ type: 'object', properties: {}, required: [] })).toThrow('require an action');
  });
});
