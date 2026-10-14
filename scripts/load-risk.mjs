// Use the project's already-installed build tool; no TS runner/package download.
import { rolldown } from 'rolldown';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function loadRisk() {
  mkdirSync('.local', { recursive: true });
  const bundle = await rolldown({ input: resolve('src/risk/test-exports.ts'), platform: 'node', external: ['zod/v4'] });
  const output = resolve('.local/risk-testing.mjs');
  await bundle.write({ file: output, format: 'esm' }); await bundle.close();
  return import(`${pathToFileURL(output)}?at=${Date.now()}`);
}
