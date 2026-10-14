import { browser } from 'wxt/browser';
import { z } from 'zod/v4';
import { BASE_URL, isFixtureUrl } from '../src/core/config';
import { reportSchema } from '../src/core/results';
import { modelConnection, prepareGpuModel } from '../src/llm/provider';
import { authorizeSession, isPopupSender, llmMessageSchema, popupCommandSchema, validateLlmBody, type Session } from '../src/extension/protocol';
import { fixtureExpectation } from '../src/extraction/fixture-expectations';
import { contractDocumentSchema, type ExtractionResult } from '../src/extraction/schema';
import { discoveryReportSchema, runReflex, scanReportSchema } from '../src/reflex/engine';
import { analyzeDocument } from '../src/risk/orchestrator';
import { requestRiskBatch } from '../src/risk/provider';
import { analysisEnvelopeSchema, interruptedReport } from '../src/extension/analysis-state';
import { uiCommandSchema, uiPage, authorizeUiCommand } from '../src/extension/ui-protocol';
import { uiSessionSchema, belongsToTab, validatedReport, sourceFinding, type UiSession } from '../src/extension/ui-session';
import { discoverLlmsTxt, authorizedPolicyUrl } from '../src/extraction/llms-txt';
import { policyCandidates } from '../src/extraction/context-manager';
import { selectDemoFrame } from '../src/extension/demo-target';

export default defineBackground(() => {
  const sessions = new Map<string, Session>();
  let active = false;
  let scan: { id: string; controller: AbortController } | undefined;
  let analysisAbort: AbortController | undefined;
  const operationTarget = async (page: string | null, tab: { id?: number; url?: string; title?: string } | undefined) => {
    if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url)) return undefined;
    if (page !== 'demo') return { frameId: 0, url: tab.url, topUrl: tab.url, title: tab.title ?? '' };
    const frames = await browser.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', func: () => ({ url: location.href, title: document.title }) });
    const frame = selectDemoFrame(frames);
    return { frameId: frame.frameId, documentId: frame.documentId, url: frame.result!.url, topUrl: tab.url, title: frame.result!.title };
  };
  const updateUi = async (change: Partial<UiSession>) => {
    const parsed = uiSessionSchema.safeParse((await browser.storage.session.get('uiSession')).uiSession);
    if (parsed.success) await browser.storage.session.set({ uiSession: { ...parsed.data, ...change } });
  };
  const initialized = browser.storage.session.get(['lastAnalysis', 'lastScan']).then(async stored => {
    const previous = analysisEnvelopeSchema.safeParse(stored.lastAnalysis);
    if (previous.success && previous.data.status === 'RUNNING') { await browser.storage.session.set({ lastAnalysis: {
      ...previous.data, status: 'INTERRUPTED', ...(previous.data.report ? { report: interruptedReport(previous.data.report) } : {}), error: 'Service Worker interrupted analysis; restart explicitly.',
    } }); await updateUi({ phase: 'INTERRUPTED' }); }
    if ((stored.lastScan as { state?: string } | undefined)?.state === 'INSPECTING') {
      await browser.storage.session.set({ lastScan: { ...(stored.lastScan as object), state: 'FAILED', documents: [], warnings: ['Service Worker interrupted document scan; restart explicitly.'] } });
      await updateUi({ phase: 'INTERRUPTED' });
    }
  });
  browser.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status !== 'loading' && !change.url) return;
    void browser.storage.session.get('uiSession').then(async stored => {
      const session = uiSessionSchema.safeParse(stored.uiSession);
      if (session.success && session.data.tabId === tabId) await updateUi({ invalidated: true });
    });
  });
  browser.tabs.onRemoved.addListener(tabId => { void browser.storage.session.get('uiSession').then(async stored => {
    const session = uiSessionSchema.safeParse(stored.uiSession);
    if (session.success && session.data.tabId === tabId) await updateUi({ invalidated: true });
  }); });
  browser.runtime.onMessage.addListener(async (message, sender) => {
    const page = uiPage(sender, browser.runtime.id, browser.runtime.getURL('/'));
    const uiCommand = uiCommandSchema.safeParse(message);
    if (uiCommand.success && authorizeUiCommand(page, uiCommand.data.type)) {
      await initialized; const command = uiCommand.data;
      if (command.type === 'STATUS') return modelConnection();
      if (command.type === 'OPEN_POLICY_LINK') {
        if (active) throw new Error('OPERATION_RUNNING');
        const stored = await browser.storage.session.get(['lastScan', 'uiSession']);
        const report = scanReportSchema.parse(stored.lastScan); const ui = uiSessionSchema.parse(stored.uiSession);
        const tab = await browser.tabs.get(ui.tabId);
        if (!belongsToTab(ui, tab) || report.sessionId !== command.sessionId || ui.sessionId !== command.sessionId ||
          !report.llmsTxt || authorizedPolicyUrl(command.url, ui.url) !== command.url ||
          !policyCandidates(report.llmsTxt, ui.url).some(link => link.url === command.url)) throw new Error('UNAUTHORIZED_POLICY_LINK');
        await browser.tabs.update(ui.tabId, { url: command.url }); return { opened: true };
      }
      if (command.type === 'CLEAR_DATA') {
        if (active) throw new Error('OPERATION_RUNNING');
        await browser.storage.session.remove(['lastScan', 'scanBinding', 'lastAnalysis', 'uiSession']);
        await browser.storage.local.remove('lastTest'); return { cleared: true };
      }
      if (command.type === 'GET_UI_STATE') {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const target = page === 'demo' ? await operationTarget(page, tab) : undefined;
        const stored = await browser.storage.session.get(['uiSession', 'lastScan', 'lastAnalysis']);
        const session = uiSessionSchema.safeParse(stored.uiSession);
        const matching = session.success && belongsToTab(session.data, tab ?? {}) && (!target || target.url === session.data.url && target.documentId === session.data.chromeDocumentId);
        return { tab: { id: tab?.id, url: target?.url ?? tab?.url, title: target?.title ?? tab?.title }, active,
          session: matching ? session.data : null, scan: matching ? stored.lastScan ?? null : null, analysis: matching ? stored.lastAnalysis ?? null : null };
      }
      if (command.type === 'GET_REPORT' || command.type === 'NAVIGATE_SOURCE') {
        if (page === 'report' && new URL(sender.url!).searchParams.get('id') !== command.jobId) throw new Error('REPORT_IDENTITY_MISMATCH');
        const result = validatedReport(await browser.storage.session.get(['uiSession', 'lastScan', 'lastAnalysis']), command.jobId);
        if (command.type === 'GET_REPORT') return result;
        if (!result.session.chromeDocumentId) throw new Error('SOURCE_VERSION_CHANGED');
        let original;
        try { original = await browser.tabs.get(result.session.tabId); } catch { throw new Error('SOURCE_TAB_CLOSED'); }
        if (result.session.invalidated || original.url !== (result.session.topUrl ?? result.session.url)) throw new Error('SOURCE_VERSION_CHANGED');
        const { finding, chunk } = sourceFinding(result.document, result.analysis, command.findingId);
        const highlighted = await browser.tabs.sendMessage(result.session.tabId, {
          type: 'HIGHLIGHT_SOURCE', expectedUrl: result.session.url, documentId: result.document.documentId,
          documentHash: result.document.contentHash, sourceChunkId: finding.sourceChunkId, quote: finding.quote,
          start: finding.evidence.start, end: finding.evidence.end, locator: chunk.sourceLocator,
        }, { documentId: result.session.chromeDocumentId });
        if (highlighted?.highlighted !== true) throw new Error('SOURCE_UNAVAILABLE');
        await browser.tabs.update(result.session.tabId, { active: true });
        await browser.windows.update(original.windowId, { focused: true }); return { highlighted: true };
      }
    }
    if (!isPopupSender(sender, browser.runtime.id, browser.runtime.getURL('/popup.html')) && page !== 'demo') throw new Error('Only an authorized extension UI may initiate operations');
    await initialized;
    const command = popupCommandSchema.parse(message);
    if (command.type === 'STATUS') return modelConnection();
    if (command.type === 'CANCEL_ANALYSIS') { analysisAbort?.abort(new Error('Risk analysis cancelled by user')); return { cancelled: !!analysisAbort }; }
    if (command.type === 'CANCEL_SCAN') { scan?.controller.abort(new Error('Scan cancelled by user')); return { cancelled: !!scan }; }
    if (command.type === 'CLEAR_SCAN') { if (active) throw new Error('Cancel the running operation before clearing source evidence'); await browser.storage.session.remove(['lastScan', 'scanBinding', 'lastAnalysis', 'uiSession']); return { cleared: true }; }
    if (active) throw new Error('Another ClauseGuard operation is running');
    // Reserve synchronously before tab/storage awaits; two popup instances cannot start duplicate jobs.
    active = true;
    try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (command.type === 'START_ANALYSIS') {
      const stored = await browser.storage.session.get(['lastScan', 'scanBinding']);
      const extracted = scanReportSchema.parse(stored.lastScan);
      const binding = z.strictObject({ tabId: z.number().int(), documentId: z.string(), url: z.string().url(), topUrl: z.string().url().optional() }).parse(stored.scanBinding);
      if (!tab?.id || tab.id !== binding.tabId || tab.url !== (binding.topUrl ?? binding.url) || extracted.documents.length !== 1 || !['READY', 'PARTIAL'].includes(extracted.state)) throw new Error('Analyze a single extracted document in its original active tab; ambiguous/stale sources are rejected');
      const document = extracted.documents[0]!; const jobId = crypto.randomUUID(); const controller = new AbortController(); analysisAbort = controller; active = true;
      const ui = uiSessionSchema.parse((await browser.storage.session.get('uiSession')).uiSession);
      if (!belongsToTab(ui, tab) || ui.sessionId !== extracted.sessionId) { active = false; analysisAbort = undefined; throw new Error('SOURCE_VERSION_CHANGED'); }
      await updateUi({ jobId, analysisStartedAt: new Date().toISOString(), phase: 'PREPARING' });
      await browser.storage.session.set({ lastAnalysis: { jobId, status: 'RUNNING' } });
      void (async () => {
        try {
          let prepared = false;
          const result = await analyzeDocument(document, {
            signal: controller.signal,
            isCurrent: async () => {
              if ((await browser.tabs.get(binding.tabId)).url !== (binding.topUrl ?? binding.url)) return false;
              const fresh = z.strictObject({ documents: z.array(contractDocumentSchema), warnings: z.array(z.string()), ambiguous: z.boolean() }).parse(await browser.tabs.sendMessage(binding.tabId,
                { type: 'EXTRACT_DOCUMENT', sessionId: jobId, expectedUrl: binding.url }, { documentId: binding.documentId }));
              return fresh.documents.length === 1 && fresh.documents[0]!.contentHash === document.contentHash && fresh.documents[0]!.documentId === document.documentId;
            },
            request: async (batch, signal) => {
              if (!prepared) {
                signal.throwIfAborted();
                await prepareGpuModel((input, init) => fetch(input, { ...init, signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) }));
                signal.throwIfAborted(); prepared = true;
              }
              await updateUi({ phase: 'ANALYZING' }); return requestRiskBatch(batch, signal);
            },
            onProgress: async report => { await browser.storage.session.set({ lastAnalysis: { jobId, status: 'RUNNING', report } }); },
          });
          await browser.storage.session.set({ lastAnalysis: { jobId, status: 'FINISHED', report: result } });
        } catch (error) { await browser.storage.session.set({ lastAnalysis: { jobId, status: 'FAILED', error: String(error) } }); }
        finally { analysisAbort = undefined; active = false; await updateUi({ phase: 'DONE' }); }
      })();
      return { jobId, status: 'RUNNING' };
    }
    if (command.type === 'START_SCAN') {
      if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url)) throw new Error('Select an HTTP(S) document tab first');
      const target = await operationTarget(page, tab); if (!target) throw Error('Source unavailable');
      const expectedUrl = target.url; const session: Session = { id: crypto.randomUUID(), tabId: tab.id, frameId: target.frameId, expiresAt: Date.now() + 180_000, requests: 0, busy: false, authorizedUrl: expectedUrl };
      const controller = new AbortController(); scan = { id: session.id, controller }; active = true;
      await browser.storage.session.remove(['lastAnalysis', 'scanBinding']);
      await browser.storage.session.set({ uiSession: { sessionId: session.id, tabId: tab.id, url: expectedUrl, title: target.title, ...(page === 'demo' ? { frameId: target.frameId, topUrl: target.topUrl } : {}), startedAt: new Date().toISOString(), phase: 'INSPECTING', invalidated: false } });
      await browser.storage.session.set({ lastScan: { sessionId: session.id, state: 'INSPECTING' } });
      void (async () => {
        let completed: unknown;
        try {
          // No persistent all-sites host permission: the toolbar invocation grants activeTab.
          const injected = await browser.scripting.executeScript({ target: { tabId: session.tabId, frameIds: [target.frameId] }, world: 'ISOLATED', files: ['/content-scripts/scan.js'] });
          session.documentId = injected[0]?.documentId;
          if (!session.documentId) throw new Error('Cannot bind scan to the injected document identity');
          await updateUi({ chromeDocumentId: session.documentId, phase: 'EXTRACTING' });
          await browser.storage.session.set({ scanBinding: { tabId: session.tabId, documentId: session.documentId, url: expectedUrl, ...(page === 'demo' ? { topUrl: target.topUrl } : {}) } });
          const send = (type: 'EXTRACT_DOCUMENT' | 'DISCOVER_DOCUMENT') => browser.tabs.sendMessage(session.tabId, { type, sessionId: session.id, expectedUrl }, { documentId: session.documentId });
          const llmsTxt = await discoverLlmsTxt(expectedUrl, fetch, controller.signal);
          const result = await runReflex(session.id, {
            expectedUrl, signal: controller.signal, currentUrl: async () => (await browser.tabs.get(session.tabId)).url === target.topUrl ? expectedUrl : '',
            extract: async () => {
              await updateUi({ phase: 'EXTRACTING' });
              const parsed = z.strictObject({ documents: z.array(contractDocumentSchema), warnings: z.array(z.string()), ambiguous: z.boolean() }).parse(await send('EXTRACT_DOCUMENT'));
              return parsed as ExtractionResult;
            },
            canDiscover: () => !!fixtureExpectation(expectedUrl)?.controls.length,
            discover: async () => {
              await updateUi({ phase: 'DISCOVERING' });
              controller.signal.throwIfAborted(); await prepareGpuModel(); controller.signal.throwIfAborted();
              sessions.set(session.id, session);
              return discoveryReportSchema.parse(await send('DISCOVER_DOCUMENT'));
            },
          });
          result.providerCalls = session.requests;
          result.llmsTxt = llmsTxt;
          // A failed GPU preparation is a SLOW attempt, but does not prove an agent ran.
          result.agentInvoked = session.requests > 0 || result.discovery !== undefined;
          completed = scanReportSchema.parse(result);
        } catch (error) {
          completed = { sessionId: session.id, state: 'FAILED', warnings: [String(error)], documents: [], providerCalls: session.requests };
        } finally {
          try { await browser.tabs.sendMessage(session.tabId, { type: 'CANCEL_DOCUMENT', sessionId: session.id }, { documentId: session.documentId }); } catch { /* navigated or closed */ }
          sessions.delete(session.id); scan = undefined; active = false;
          await browser.storage.session.set({ lastScan: completed });
          await updateUi({ phase: 'DONE' });
        }
      })();
      return { sessionId: session.id, state: 'INSPECTING' };
    }
    if (!tab?.id || !isFixtureUrl(tab.url)) throw new Error('Open the exact local fixture in the active tab first');
    const session: Session = { id: crypto.randomUUID(), tabId: tab.id, expiresAt: Date.now() + 180_000, requests: 0, busy: false };
    active = true;
    sessions.set(session.id, session);
    await browser.storage.local.set({ lastTest: { sessionId: session.id, status: 'RUNNING', data: 'Preparing the local GPU model…' } });
    void (async () => {
      let completed: unknown;
      try {
        await prepareGpuModel();
        if (!isFixtureUrl((await browser.tabs.get(session.tabId)).url)) throw new Error('The authorized tab navigated away');
        const result = reportSchema.parse(await browser.tabs.sendMessage(session.tabId, { type: 'RUN_AGENT', sessionId: session.id }, { frameId: 0 }));
        if (result.sessionId !== session.id) throw new Error('Result session mismatch');
        completed = result;
      } catch (error) {
        completed = { sessionId: session.id, status: 'FAIL', data: String(error) };
      } finally { sessions.delete(session.id); active = false; await browser.storage.local.set({ lastTest: completed }); }
    })();
    return { sessionId: session.id, status: 'RUNNING' };
    } catch (error) { active = false; scan = undefined; analysisAbort = undefined; throw error; }
  });

  browser.runtime.onConnect.addListener(port => {
    const match = /^clauseguard-llm:([0-9a-f-]{36})$/.exec(port.name);
    if (!match || !port.sender) { port.disconnect(); return; }
    const sessionId = match[1]!;
    const session = sessions.get(sessionId);
    try {
      authorizeSession(session, port.sender, browser.runtime.id);
      if (session!.documentId === undefined) session!.documentId = port.sender.documentId;
    } catch { port.disconnect(); return; }
    const controllers = new Map<string, AbortController>();
    const expiry = setTimeout(() => port.disconnect(), Math.max(1, session!.expiresAt - Date.now()));
    port.onDisconnect.addListener(() => { clearTimeout(expiry); for (const controller of controllers.values()) controller.abort(); });
    port.onMessage.addListener(message => {
      const cancellation = z.strictObject({ type: z.literal('CANCEL'), requestId: z.string().uuid() }).safeParse(message);
      if (cancellation.success) { controllers.get(cancellation.data.requestId)?.abort(); return; }
      void (async () => {
        let requestId = '';
        let authorized: Session | undefined;
        try {
          const request = llmMessageSchema.parse(message); requestId = request.requestId;
          authorized = authorizeSession(sessions.get(sessionId), port.sender!, browser.runtime.id);
          const body = validateLlmBody(request.body);
          authorized.busy = true; authorized.requests++;
          const controller = new AbortController(); controllers.set(requestId, controller);
          const timeout = setTimeout(() => controller.abort(), 85_000);
          try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
              signal: controller.signal, redirect: 'error',
            });
            const text = await response.text();
            if (text.length > 100_000) throw new Error('Provider response too large');
            port.postMessage({ requestId, status: response.status, body: text });
          } finally { clearTimeout(timeout); controllers.delete(requestId); }
        } catch (error) {
          try { port.postMessage({ requestId, error: String(error) }); } catch { /* disconnected */ }
        } finally { if (authorized) authorized.busy = false; }
      })();
    });
  });
});
