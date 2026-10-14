import fs from 'node:fs';
import { resolve, relative } from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = process.cwd(); const entries = [];
const table = Array.from({ length: 256 }, (_, n) => { for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc = b => { let n = 0xffffffff; for (const x of b) n = table[(n ^ x) & 255] ^ (n >>> 8); return (n ^ 0xffffffff) >>> 0; };
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isSymbolicLink() ? [] : e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]);
}
function zip(files, destination, prefix = '') {
  const parts = [], central = []; let offset = 0;
  for (const file of [...new Set(files)].sort()) {
    const name = relative(resolve(prefix || root), resolve(file)).replaceAll('\\', '/');
    if (name.startsWith('../') || name.includes('/.local/') || name.includes('/node_modules/')) throw Error('Unsafe archive member');
    const bytes = fs.readFileSync(file), compressed = deflateRawSync(bytes), filename = Buffer.from(name), checksum = crc(bytes);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0x21, 12); header.writeUInt32LE(checksum, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0x21, 14); c.writeUInt32LE(checksum, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(bytes.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
    parts.push(header, filename, compressed); central.push(c, filename); offset += header.length + filename.length + compressed.length;
    if (!inflateRawSync(compressed).equals(bytes)) throw Error('Archive compression verification failed');
  }
  const index = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE([...new Set(files)].length, 8); end.writeUInt16LE([...new Set(files)].length, 10); end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
  const output = Buffer.concat([...parts, index, end]); fs.writeFileSync(destination, output);
  const actual = fs.readFileSync(destination); let cursor = 0, count = 0;
  while (actual.readUInt32LE(cursor) === 0x04034b50) {
    const size = actual.readUInt32LE(cursor + 18), length = actual.readUInt16LE(cursor + 26), extra = actual.readUInt16LE(cursor + 28), start = cursor + 30 + length + extra;
    const data = inflateRawSync(actual.subarray(start, start + size)); if (crc(data) !== actual.readUInt32LE(cursor + 14)) throw Error('Written ZIP CRC verification failed');
    cursor = start + size; count++;
  }
  if (count !== [...new Set(files)].length) throw Error('Written ZIP member count mismatch');
  entries.push({ path: destination, bytes: actual.length, files: count, verifiedInflationAndCrc: true, sha256: createHash('sha256').update(actual).digest('hex') });
}
fs.mkdirSync('delivery', { recursive: true });
const extension = walk('.output/chrome-mv3'); if (!extension.length) throw Error('Build the actual extension first');
zip(extension, 'delivery/clauseguard-chrome-mv3.zip', '.output/chrome-mv3');
const roots = ['src', 'entrypoints', 'public', 'fixtures', 'tests', 'scripts', 'evaluation', 'cypress', 'docs/screenshots', 'docs/evidence/final'];
const files = roots.flatMap(walk).filter(p => !p.endsWith('.log') && !p.endsWith('.utf16.txt'));
files.push(...fs.readdirSync('docs').filter(n => n.endsWith('.md')).map(n => 'docs/' + n));
for (const p of ['README.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'wxt.config.ts', 'vitest.config.ts', 'cypress.config.mjs', 'cypress.probe.config.mjs', '.gitignore', 'demo/clauseguard-demo.mp4', 'docs/evidence/p4/security/summary.json', 'docs/evidence/p4.1/baseline/evaluation__metrics__latest.json']) if (fs.existsSync(p)) files.push(p);
zip(files, 'delivery/clauseguard-source.zip');
fs.writeFileSync('delivery/manifest.json', JSON.stringify({ at: new Date().toISOString(), publication: 'NOT_PUSHED', artifacts: entries, exclusions: ['node_modules', '.local models/binaries/profiles/private source traffic', 'temporary builds except separate extension ZIP', 'raw/failure videos and decoded frames retained locally', 'credentials'], rawVideo: 'demo/raw/demo.cy.mjs.mp4' }, null, 2));
console.log(JSON.stringify(entries));
