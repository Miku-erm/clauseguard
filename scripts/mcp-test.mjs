import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { buildMcp } from './mcp-build.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
await buildMcp(); process.env.CLAUSEGUARD_MCP_LIBRARY = '1';
const { categoryOutputSchema, evidenceOutputSchema, analysisOutputSchema } = await import('../.local/clauseguard-mcp.mjs');
const client = new Client({ name: 'clauseguard-verification-client', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: ['.local/clauseguard-mcp.mjs'],
  env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', CLAUSEGUARD_MCP_LIBRARY: '0' }, stderr: 'pipe' });
const journal = []; const originalSend = transport.send.bind(transport);
transport.send = async message => { journal.push({ direction: 'CLIENT_TO_SERVER', at: new Date().toISOString(), message }); return originalSend(message); };
const text = 'Your subscription automatically renews each month without advance reminders. Cancellation must reach us thirty days before renewal.';
const results = []; const save = () => {
  mkdirSync('docs/evidence/final', { recursive: true });
  writeFileSync('docs/evidence/final/mcp.json', JSON.stringify({ at: new Date().toISOString(), results, journal }, null, 2));
};
try {
  await client.connect(transport);
  results.push({ test: 'initialization', pass: true, server: client.getServerVersion() });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['analyze_document', 'get_risk_categories', 'verify_evidence']);
  results.push({ test: 'tool-discovery', pass: true, tools }); save();
  const categories = await client.callTool({ name: 'get_risk_categories', arguments: {} });
  assert(!categories.isError); categoryOutputSchema.parse(categories.structuredContent);
  results.push({ test: 'categories-real-protocol', pass: true, result: categories });
  const args = { sourceId: 'mcp-demo', documentText: text, quote: text, category: 'AUTOMATIC_RENEWAL' };
  const evidence = await client.callTool({ name: 'verify_evidence', arguments: args });
  assert(!evidence.isError); assert(evidenceOutputSchema.parse(evidence.structuredContent).verified);
  results.push({ test: 'evidence-real-protocol', pass: true, result: evidence });
  const invented = await client.callTool({ name: 'verify_evidence', arguments: { ...args, quote: 'Fabricated source quotation.' } });
  assert(!evidenceOutputSchema.parse(invented.structuredContent).verified);
  results.push({ test: 'invented-quote-rejected', pass: true, result: invented });
  const invalid = await client.callTool({ name: 'verify_evidence', arguments: { ...args, category: 'INVALID', filePath: 'unrelated' } });
  assert(invalid.isError); results.push({ test: 'invalid-arguments-rejected', pass: true, result: invalid }); save();
  const analysis = await client.callTool({ name: 'analyze_document', arguments: { sourceId: 'mcp-demo', documentText: text } }, undefined, { timeout: 210_000 });
  assert(!analysis.isError); const parsed = analysisOutputSchema.parse(analysis.structuredContent);
  assert(parsed.report.coverage.analyzedChunks.length > 0); assert(parsed.report.findings.some(f => f.category === 'AUTOMATIC_RENEWAL'));
  assert.equal(parsed.report.score, null); assert.equal(parsed.report.coverage.extractionStatus, 'UNKNOWN');
  results.push({ test: 'actual-local-Qwen-analysis', pass: true, result: analysis }); save();
  console.log('PASS: real stdio initialization, tool discovery, validated calls, invalid input and Qwen analysis');
} catch (error) { results.push({ test: 'failure', pass: false, error: String(error) }); save(); throw error; }
finally { await client.close(); }
