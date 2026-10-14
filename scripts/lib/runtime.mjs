import { execFileSync } from 'node:child_process';

export function inspectRuntime(executable = 'ollama', runner = execFileSync) {
  try { return { status: 'PASS', version: String(runner(executable, ['--version'], { encoding: 'utf8', timeout: 5000 })).trim() }; }
  catch (error) { return { status: 'BLOCKED', kind: error.code === 'ENOENT' ? 'missing-runtime' : 'runtime-error', error: String(error) }; }
}
