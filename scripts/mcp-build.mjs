import { rolldown } from 'rolldown';
import { mkdirSync } from 'node:fs';
export async function buildMcp() {
  mkdirSync('.local', { recursive: true });
  const bundle = await rolldown({ input: 'src/mcp/server.ts', platform: 'node',
    external: ['@modelcontextprotocol/server', '@modelcontextprotocol/server/stdio', 'zod/v4', 'jsdom'] });
  await bundle.write({ file: '.local/clauseguard-mcp.mjs', format: 'esm' }); await bundle.close();
}
