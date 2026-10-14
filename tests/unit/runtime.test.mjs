import { expect, it, vi } from 'vitest';
import { inspectRuntime } from '../../scripts/lib/runtime.mjs';

it('reports a missing Ollama executable as BLOCKED without installing alternatives', () => {
  const runner = vi.fn(() => { throw Object.assign(new Error('Executable missing'), { code: 'ENOENT' }); });
  expect(inspectRuntime('ollama', runner)).toMatchObject({ status: 'BLOCKED', kind: 'missing-runtime' });
  expect(runner).toHaveBeenCalledOnce();
});
it('distinguishes a failed installed runtime from a missing runtime', () => {
  expect(inspectRuntime('ollama', () => { throw new Error('Runtime failed'); })).toMatchObject({ status: 'BLOCKED', kind: 'runtime-error' });
  expect(inspectRuntime('ollama', () => 'ollama version is 0.40.0')).toMatchObject({ status: 'PASS' });
});
