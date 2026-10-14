import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
export function browserExecutable() {
  const candidate = process.env.CLAUSEGUARD_CHROME || chromium.executablePath();
  if (existsSync(candidate)) return candidate;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? (process.platform === 'win32' ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright'));
  if (existsSync(cache)) for (const name of readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))) {
    for (const suffix of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome']) {
      const executable = join(cache, name, suffix); if (existsSync(executable)) return executable;
    }
  }
  throw Error('Chromium missing. Set CLAUSEGUARD_CHROME or run node node_modules/playwright-core/cli.js install chromium.');
}
