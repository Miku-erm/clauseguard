import { browser } from 'wxt/browser';
import { runFixtureAgent } from '../src/agent/fixture-agent';
import { isFixtureUrl } from '../src/core/config';
import { createLocalFetch } from '../src/extension/local-fetch';
import { runCommandSchema } from '../src/extension/protocol';

export default defineContentScript({
  matches: ['http://127.0.0.1/*'], runAt: 'document_idle', world: 'ISOLATED',
  main() {
    if (!isFixtureUrl(location.href)) return;
    let running = false;
    browser.runtime.onMessage.addListener(async (message, sender) => {
      if (!message || message.type !== 'RUN_AGENT') return undefined;
      if (sender.id !== browser.runtime.id || sender.tab) throw new Error('Only extension Service Worker messages are accepted');
      const command = runCommandSchema.parse(message);
      if (running) throw new Error('A fixture task is already running');
      running = true;
      const bridge = createLocalFetch(command.sessionId);
      try { return await runFixtureAgent(command.sessionId, bridge.fetch); }
      finally { bridge.close(); running = false; }
    });
    console.info('[ClauseGuard] ISOLATED content script ready');
  },
});
