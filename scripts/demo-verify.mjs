import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { videoTools, probe } from './lib/video-tools.mjs';
import { createHash } from 'node:crypto';
const path = 'demo/clauseguard-demo.mp4'; assert(fs.existsSync(path));
const metadata = probe(path); const video = metadata.streams.find(s => s.codec_type === 'video');
assert(metadata.format.format_name.split(',').includes('mp4')); assert(video);
assert(Number(metadata.format.duration) > 0 && Number(metadata.format.duration) <= 90);
assert(video.width >= 1280 && video.height >= 720);
execFileSync(videoTools().ffmpeg, ['-v', 'error', '-i', path, '-f', 'null', '-'], { stdio: 'pipe' });
fs.mkdirSync('demo/frames', { recursive: true });
const edit = JSON.parse(fs.readFileSync('docs/evidence/final/demo/edit.json'));
const events = JSON.parse(fs.readFileSync('docs/evidence/final/demo/events.json')).events;
const samples = [...events.filter(e => ['report', 'verified-quote-visible', 'uncertainty-visible', 'disclaimer-visible'].includes(e.name)),
  ...events.filter(e => e.name === 'scan-end' && e.scan?.path === 'SLOW')].map((e, index) => {
  const sourceTime = Math.min(edit.rawDuration - 0.2, e.relativeMs / 1000 + 1);
  const segment = edit.segments.find(s => sourceTime >= s.sourceStart && sourceTime <= s.sourceEnd);
  const time = segment ? segment.outputStart + (sourceTime - segment.sourceStart) / segment.speed : Number(metadata.format.duration) / 2;
  const frame = `demo/frames/${index}-${e.name}.png`;
  execFileSync(videoTools().ffmpeg, ['-y', '-v', 'error', '-ss', String(time), '-i', path, '-frames:v', '1', frame]);
  return { name: e.name, time, frame };
});
const sha256 = createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const reviewPath = 'docs/evidence/final/demo/visual-review.json';
const review = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath)) : null;
fs.writeFileSync('docs/evidence/final/demo/video-verification.json', JSON.stringify({ at: new Date().toISOString(), path, sha256, status: review?.sha256 === sha256 && review.status === 'PASS' ? 'PASS' : 'TECHNICAL_PASS_VISUAL_REVIEW_PENDING', duration: Number(metadata.format.duration), width: video.width, height: video.height, codec: video.codec_name, decoded: true, metadata, samples }, null, 2));
console.log(JSON.stringify({ duration: metadata.format.duration, resolution: [video.width, video.height], decoded: true, frames: samples.map(s => s.frame) }));
