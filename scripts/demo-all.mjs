import { spawnSync } from 'node:child_process';
for (const name of ['demo-record', 'demo-edit', 'demo-verify']) {
  const result = spawnSync(process.execPath, [`scripts/${name}.mjs`], { stdio: 'inherit' });
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
