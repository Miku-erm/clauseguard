import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { useSession } from './use-session';
import { Brand, Card, Disclaimer, Score, Loading } from './components';
import { statusTr, extractionTr, errorTr, connectionTr, pageAccessibility } from './presentation';
import type { Connection } from '../llm/provider';
import { z } from 'zod/v4';
export function App({ onReport }: { onReport?: (jobId: string) => void } = {}) {
  const { snapshot, error: sessionError, refresh } = useSession();
  const [connection, setConnection] = useState<Connection>(); const [error, setError] = useState<unknown>(); const [starting, setStarting] = useState(false);
  const [last, setLast] = useState<{ status: string; data: string }>();
  useEffect(() => {
    void browser.runtime.sendMessage({ type: 'STATUS' }).then(setConnection).catch(setError);
    const update = () => { void browser.storage.local.get('lastTest').then(stored => { const parsed = z.object({ status: z.string(), data: z.string().optional() }).safeParse(stored.lastTest); setLast(parsed.success ? { status: parsed.data.status, data: parsed.data.data ?? '' } : undefined); }); };
    update(); browser.storage.onChanged.addListener(update); return () => browser.storage.onChanged.removeListener(update);
  }, []);
  const scan = snapshot?.scan; const analysis = snapshot?.analysis; const report = analysis?.report; const access = pageAccessibility(snapshot?.tab.url);
  const busy = starting || snapshot?.active === true || last?.status === 'RUNNING';
  async function command(type: string) { setStarting(true); setError(undefined); try { await browser.runtime.sendMessage({ type }); await refresh(); } catch (error) { setError(error); } finally { setStarting(false); } }
  async function openReport() { if (analysis?.jobId) { if (onReport) onReport(analysis.jobId); else await browser.tabs.create({ url: browser.runtime.getURL(`/report.html?id=${analysis.jobId}`) }); } }
  const running = analysis?.status === 'RUNNING'; const batches = report?.coverage.batches;
  return <main className="popup-shell">
    <header className="flex items-center justify-between"><Brand/><button className="icon-button" aria-label="Ayarları aç" onClick={() => void browser.tabs.create({ url: browser.runtime.getURL('/settings.html') })}>⚙</button></header>
    <p className="eyebrow mt-5">ETKİN SAYFA</p><h2 className="font-semibold text-base mt-1 truncate">{snapshot?.tab.title || 'Sayfa bilgisi bekleniyor'}</h2>
    <p className="url text-xs text-slate-500" data-testid="current-url">{snapshot?.tab.url ?? 'Sayfa adresi alınamadı'}</p><p className="text-xs mt-2 text-slate-600">{access.text}</p>
    <div className={`connection ${connection?.connected ? 'connected' : ''}`} role="status"><span aria-hidden="true">●</span>{connectionTr(connection)}</div>
    {(error !== undefined || sessionError !== undefined) && <p className="notice" role="alert">{errorTr(error ?? sessionError)}</p>}
    <Card title="1 · Sözleşmeyi bul">
      <p data-testid="scan-state" className="font-semibold">{statusTr[scan?.state ?? 'IDLE'] ?? 'Tarama sonucu alınamadı'}</p>
      {snapshot?.active && !running && snapshot.session && <Loading text={statusTr[snapshot.session.phase] ?? 'Sözleşme aranıyor'}/>}
      {scan?.documents?.length === 1 && <p className="text-sm text-slate-600">{scan.documents[0]!.sourceChunks.length} metin parçası · {extractionTr[scan.documents[0]!.extraction.status]}</p>}
      {!!scan?.warnings?.length && <p className="text-xs text-slate-600 mt-2">{scan.state === 'FAILED' ? errorTr(scan.warnings[0]) : 'Belgenin kapsamı sınırlı veya belirsiz olabilir. Ayrıntılar raporda gösterilir.'}</p>}
      <button className="button secondary mt-3" onClick={() => void command('START_SCAN')} disabled={busy || !access.allowed}>Belgeyi Tara</button>
      {scan?.llmsTxt?.status === 'FOUND' && <div className="mt-3 text-sm" data-testid="llms-discovery">
        <p>llms.txt: {scan.llmsTxt.links.length} ilgili belge bağlantısı bulundu.</p>
        {scan.llmsTxt.links.map(link => <button key={link.url} className="button quiet mt-2" disabled={busy}
          onClick={() => { void browser.runtime.sendMessage({ type: 'OPEN_POLICY_LINK', sessionId: scan.sessionId, url: link.url }).catch(setError); }}>{link.label}</button>)}
      </div>}
      {snapshot?.active && !running && scan?.state === 'INSPECTING' && <button className="button quiet mt-2" onClick={() => void command('CANCEL_SCAN')}>İptal</button>}
    </Card>
    <Card title="2 · Riskleri incele">
      <button className="button primary" onClick={() => void command('START_ANALYSIS')} disabled={busy || !access.allowed || scan?.documents?.length !== 1 || !['READY', 'PARTIAL'].includes(scan?.state ?? '')}>Risk Analizi Yap</button>
      <p className="text-xs text-slate-500 mt-2">Yalnızca isteğinizle, cihazınızdaki model üzerinden çalışır.</p>
      {running && <div className="mt-3" aria-live="polite"><Loading text={statusTr[snapshot?.session?.phase ?? 'RUNNING'] ?? statusTr.RUNNING!}/>{batches && <p className="text-sm mt-2">{batches.filter(batch => batch.status === 'COMPLETE').length} / {batches.length} metin grubu incelendi</p>}<p className="text-xs text-slate-500">Her grup sonrasında kaynak alıntıları doğrulanır. Yüzde ilerleme tahmin edilmez.</p></div>}
      <button className={`button quiet mt-2 ${running ? '' : 'hidden'}`} onClick={() => void command('CANCEL_ANALYSIS')} disabled={!running}>Risk Analizini İptal Et</button>
      <p data-testid="analysis-status" className="font-semibold mt-3">{running ? 'Analiz devam ediyor' : analysis?.status === 'INTERRUPTED' ? statusTr.INTERRUPTED : report ? statusTr[report.status] : analysis ? statusTr[analysis.status] : 'Henüz analiz yapılmadı'}</p>
      {analysis?.error && <p role="alert" className="notice">{errorTr(analysis.error)}</p>}
      {report && !running && <><Score report={report}/><p className="text-sm mt-3">{report.findings.length} doğrulanmış bulgu · {report.rejectedFindingCount} dışlanan bulgu</p><button className="button secondary mt-3" onClick={() => void openReport()}>Ayrıntılı Raporu Aç</button></>}
    </Card>
    <div className="flex gap-3 justify-between text-xs"><button className="text-button" disabled={busy || !scan} onClick={() => void command('CLEAR_SCAN')}>Tarama verisini temizle</button><button className="text-button" onClick={() => void command('START_TEST')} disabled={busy || !connection?.connected}>Page Agent Testi</button></div>
    {last && <p className="text-xs mt-2" data-testid="last-status">Tanılama: {statusTr[last.status] ?? 'Sonuç bekleniyor'}</p>}
    <Disclaimer/>
  </main>;
}
