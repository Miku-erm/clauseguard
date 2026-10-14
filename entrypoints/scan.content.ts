import { browser } from 'wxt/browser';
import { extractDocuments } from '../src/extraction/dom';
import { scanCommandSchema } from '../src/extension/scan-protocol';
import { createLocalFetch } from '../src/extension/local-fetch';
import { discoverPolicy } from '../src/agent/discovery-agent';
import { navigateSourceSchema, highlightSource } from '../src/extension/source-navigation';

export default defineContentScript({
  matches: [], registration: 'runtime', world: 'ISOLATED',
  main() {
    const state = globalThis as typeof globalThis & { __clauseguardScanInstalled?: boolean };
    if (state.__clauseguardScanInstalled) return; state.__clauseguardScanInstalled = true;
    let active: { id: string; controller: AbortController } | undefined;
    browser.runtime.onMessage.addListener(async (message, sender) => {
      const navigation = navigateSourceSchema.safeParse(message);
      if (navigation.success) {
        if (sender.id !== browser.runtime.id || sender.tab) throw new Error('Only the extension Service Worker may request document operations');
        return highlightSource(document, navigation.data);
      }
      if (!scanCommandSchema.safeParse(message).success) return undefined;
      if (sender.id !== browser.runtime.id || sender.tab) throw new Error('Only the extension Service Worker may request document operations');
      const command = scanCommandSchema.parse(message);
      if (command.type === 'CANCEL_DOCUMENT') { if (active?.id === command.sessionId) active.controller.abort(new Error('Scan cancelled')); return { cancelled: true }; }
      if (command.expectedUrl !== location.href) throw new Error('Stale document URL');
      if (command.type === 'EXTRACT_DOCUMENT') return extractDocuments(document, location.href);
      if (active) throw new Error('Discovery already running');
      active = { id: command.sessionId, controller: new AbortController() };
      const bridge = createLocalFetch(command.sessionId);
      try { return await discoverPolicy(bridge.fetch, active.controller.signal); }
      finally { bridge.close(); active = undefined; }
    });
  },
});
