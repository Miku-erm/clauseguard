import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
let failed = false;
const exits = [];
const evidence = process.env.CLAUSEGUARD_SUITE_EVIDENCE_DIR;
if (evidence) mkdirSync(evidence, { recursive: true });
for (const [script, environment] of [
  ['scripts/test-p3-browser.mjs', { CLAUSEGUARD_P3_EVIDENCE_DIR: process.env.CLAUSEGUARD_P3_EVIDENCE_DIR ?? resolve('docs/evidence/p3-browser-verified') }],
  ['scripts/test-p2-browser.mjs', { CLAUSEGUARD_P2_BROWSER_EVIDENCE_DIR: process.env.CLAUSEGUARD_P2_BROWSER_EVIDENCE_DIR ?? resolve('docs/evidence/p3-p2-regression') }],
  ['scripts/test-p1-browser.mjs', { CLAUSEGUARD_P1_EVIDENCE_DIR: process.env.CLAUSEGUARD_P1_EVIDENCE_DIR ?? resolve('docs/evidence/p3-p1-regression') }],
  ['scripts/test-browser.mjs', { CLAUSEGUARD_EVIDENCE_DIR: process.env.CLAUSEGUARD_EVIDENCE_DIR ?? resolve('docs/evidence/p3-p0.1-regression'), CLAUSEGUARD_ATTEMPTS: process.env.CLAUSEGUARD_ATTEMPTS ?? '3' }],
]) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', env: { ...process.env, ...environment }, timeout: 300_000 });
  exits.push({ script, at: new Date().toISOString(), exitCode: result.status, error: result.error ? String(result.error) : null });
  if (evidence) writeFileSync(resolve(evidence, 'suite-exits.json'), JSON.stringify(exits, null, 2));
  if (result.status !== 0 || result.error) { failed = true; console.error(result.error ?? `${script} exited ${result.status}`); }
}
if (failed) process.exitCode = 1;
