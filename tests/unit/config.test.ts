import { describe, expect, it } from 'vitest';
import { BASE_URL, MODEL, configSchema, isFixtureUrl, validateProviderUrl } from '../../src/core/config';

describe('local configuration', () => {
  it('accepts only the authorized local model and context', () => {
    expect(configSchema.parse({ baseURL: BASE_URL, model: MODEL, context: 8192 })).toBeTruthy();
    for (const change of [{ model: 'qwen3:4b' }, { context: 4096 }, { apiKey: 'secret' }]) {
      expect(configSchema.safeParse({ baseURL: BASE_URL, model: MODEL, context: 8192, ...change }).success).toBe(false);
    }
  });
  it.each(['https://cloud.example/v1', 'http://localhost:11434/v1', 'http://0.0.0.0:11434/v1',
    'http://192.168.1.2:11434/v1', 'http://127.0.0.1:8080/v1', 'http://127.0.0.1:11434/api/pull',
    'http://user:password@127.0.0.1:11434/v1', 'http://127.0.0.1:11434/v1?url=remote', 'http://127.0.0.1:11434/v1#x'])('rejects provider %s', value => {
    expect(() => validateProviderUrl(value)).toThrow();
  });
  it('requires the exact approved fixture', () => {
    expect(isFixtureUrl('http://127.0.0.1:4173/fixture.html')).toBe(true);
    expect(isFixtureUrl('http://127.0.0.1:4173/fixture.html?next=evil')).toBe(false);
    expect(isFixtureUrl('http://example.com/fixture.html')).toBe(false);
  });
});
