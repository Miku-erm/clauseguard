import fs from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { videoTools, probe } from './lib/video-tools.mjs';
const results = JSON.parse(fs.readFileSync('docs/evidence/final/demo/cypress-results.json'));
if (results.totalFailed || results.totalPassed !== 2) throw Error('Refusing final edit: both actual Cypress scenarios must pass. Failed raw recordings remain archived.');
const raw = resolve(results.runs[0].video);
if (relative(resolve('demo/raw'), raw).startsWith('..') || !fs.existsSync(raw)) throw Error('Raw Cypress input must exist inside demo/raw');
const metadata = probe(raw); const duration = Number(metadata.format.duration);
const capture = JSON.parse(fs.readFileSync('docs/evidence/final/demo/events.json'));
const intervals = [];
for (const e of capture.events.filter(e => ['scan-start', 'analysis-start'].includes(e.name))) {
  const end = capture.events.find(v => v.name === e.name.replace('-start', '-end') && v.relativeMs > e.relativeMs);
  if (end) intervals.push({ start: Math.max(0, e.relativeMs / 1000), end: Math.min(duration, end.relativeMs / 1000) });
}
const waiting = intervals.reduce((n, i) => n + Math.max(0, i.end - i.start), 0); const regular = duration - waiting;
if (regular > 84) throw Error('Nonprocessing footage exceeds target; shorten genuine presentation pauses instead of fabricating a result');
const speed = duration > 82 ? Math.max(1, waiting / Math.max(1, 80 - regular)) : 1;
const points = [...new Set([0, duration, ...intervals.flatMap(i => [i.start, i.end])])].filter(t => t >= 0 && t <= duration).sort((a, b) => a - b);
fs.mkdirSync('.local/demo-edit', { recursive: true });
const font = process.env.DEMO_FONT ?? join(process.env.SystemRoot ?? 'C:\\Windows', 'Fonts', 'arial.ttf');
fs.copyFileSync(font, '.local/demo-edit/font.ttf');
const filters = [], segments = []; let outputTime = 0;
for (let i = 0; i < points.length - 1; i++) {
  const start = points[i], end = points[i + 1]; if (end <= start) continue;
  const processing = intervals.some(r => start >= r.start && end <= r.end); const factor = processing ? speed : 1;
  const title = processing && factor > 1 ? `Gerçek yerel işlem · ${factor.toFixed(2).replace('.', ',')}× hızlandırıldı` : 'ClauseGuard · Gerçek uygulama kaydı · Bu uygulama hukuki tavsiye vermez.';
  fs.writeFileSync(`.local/demo-edit/title-${i}.txt`, title);
  filters.push(`[0:v]trim=start=${start}:end=${end},setpts=(PTS-STARTPTS)/${factor},scale=1800:-2:flags=lanczos,format=yuv420p,drawbox=x=0:y=0:w=iw:h=48:color=0x14284b@0.96:t=fill,drawtext=fontfile=.local/demo-edit/font.ttf:textfile=.local/demo-edit/title-${i}.txt:fontcolor=white:fontsize=23:x=20:y=10[s${i}]`);
  segments.push({ sourceStart: start, sourceEnd: end, speed: factor, processing, outputStart: outputTime, outputEnd: outputTime + (end - start) / factor });
  outputTime += (end - start) / factor;
}
filters.push(segments.map((_, i) => `[s${i}]`).join('') + `concat=n=${segments.length}:v=1:a=0[out]`);
fs.writeFileSync('.local/demo-edit/filter.txt', filters.join(';\n'));
execFileSync(videoTools().ffmpeg, ['-y', '-i', raw, '-filter_complex_script', '.local/demo-edit/filter.txt', '-map', '[out]', '-an', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart', 'demo/clauseguard-demo.mp4'], { stdio: 'inherit' });
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync('docs/evidence/final/demo/edit.json', JSON.stringify({ at: new Date().toISOString(), raw, rawSha256: hash(raw), rawDuration: duration, final: 'demo/clauseguard-demo.mp4', finalSha256: hash('demo/clauseguard-demo.mp4'), source: 'Actual passing Cypress recording, no mocked reports/inference', estimatedOutputDuration: outputTime, segments }, null, 2));
console.log('Actual raw Cypress footage edited; original preserved');
