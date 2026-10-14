import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { z } from 'zod/v4';
import { uiSessionSchema } from '../extension/ui-session';
import { analysisEnvelopeSchema } from '../extension/analysis-state';
import { scanReportSchema } from '../reflex/engine';
const snapshotSchema = z.strictObject({ tab: z.object({ id: z.number().optional(), url: z.string().optional(), title: z.string().optional() }), active: z.boolean(),
  session: uiSessionSchema.nullable(), scan: scanReportSchema.partial().nullable(), analysis: analysisEnvelopeSchema.nullable() });
export type Snapshot = z.infer<typeof snapshotSchema>;
export function useSession() {
  const [snapshot, setSnapshot] = useState<Snapshot>(); const [error, setError] = useState<unknown>();
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try { const next = snapshotSchema.parse(await browser.runtime.sendMessage({ type: 'GET_UI_STATE' })); if (request === generation.current) { setSnapshot(next); setError(undefined); } }
    catch (error) { if (request === generation.current) setError(error); }
  }, []);
  useEffect(() => {
    void refresh(); const changed = () => { void refresh(); };
    browser.storage.onChanged.addListener(changed); browser.tabs.onActivated.addListener(changed); browser.tabs.onUpdated.addListener(changed);
    return () => { generation.current++; browser.storage.onChanged.removeListener(changed); browser.tabs.onActivated.removeListener(changed); browser.tabs.onUpdated.removeListener(changed); };
  }, [refresh]);
  return { snapshot, error, refresh };
}
