import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
export function videoTools() {
  const ffprobe = process.env.FFPROBE_PATH || require('@ffprobe-installer/ffprobe').path;
  let ffmpeg = process.env.FFMPEG_PATH;
  if (!ffmpeg) {
    try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); ffmpeg = 'ffmpeg'; } catch {
      const version = require('cypress/package.json').version;
      ffmpeg = join(process.env.CYPRESS_CACHE_FOLDER ?? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Cypress', 'Cache'), version,
        'Cypress', 'resources', 'app', 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
      if (!existsSync(ffmpeg)) throw Error('FFmpeg unavailable; set FFMPEG_PATH to an installed executable.');
    }
  }
  return { ffmpeg, ffprobe };
}
export function probe(file) {
  return JSON.parse(execFileSync(videoTools().ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { encoding: 'utf8' }));
}
