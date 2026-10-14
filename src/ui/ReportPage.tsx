import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { z } from 'zod/v4';
import { analysisEnvelopeSchema } from '../extension/analysis-state';
import { uiSessionSchema } from '../extension/ui-session';
import { contractDocumentSchema } from '../extraction/schema';
import { CATEGORIES } from '../risk/categories';
import { Brand, Card, Disclaimer, Score, Loading } from './components';
import { statusTr, extractionTr, severityTr, documentTypeTr, errorTr } from './presentation';
const reportViewSchema = z.strictObject({ session: uiSessionSchema, document: contractDocumentSchema, analysis: analysisEnvelopeSchema });
export function ReportPage({ suppliedJobId }: { suppliedJobId?: string } = {}) {
  const [view, setView] = useState<z.infer<typeof reportViewSchema>>(); const [error, setError] = useState<unknown>(); const [sourceMessage, setSourceMessage] = useState('');
  const jobId = suppliedJobId ?? new URL(location.href).searchParams.get('id');
  useEffect(() => {
    const refresh = () => { void browser.runtime.sendMessage({ type: 'GET_REPORT', jobId }).then(raw => { setView(reportViewSchema.parse(raw)); setError(undefined); }).catch(error => { setView(undefined); setError(error); }); };
    refresh(); browser.storage.onChanged.addListener(refresh); return () => browser.storage.onChanged.removeListener(refresh);
  }, [jobId]);
  const report = view?.analysis.report;
  async function source(findingId: string) {
    setSourceMessage('Kaynak belge doğrulanıyor…');
    try { await browser.runtime.sendMessage({ type: 'NAVIGATE_SOURCE', jobId, findingId }); setSourceMessage('Özgün alıntı kaynak sekmede sekiz saniye vurgulandı.'); }
    catch (error) { setSourceMessage(errorTr(error)); }
  }
  return <main className="page-shell"><header className="page-header"><Brand/><a className="text-button" href="settings.html">Ayarlar</a></header>
    <div className="my-8"><p className="eyebrow">KAYNAĞA DAYALI İNCELEME</p><h2 className="page-title">Risk raporu</h2><p className="text-slate-600 mt-2">Özgün sözleşme metni, doğrulanmış alıntılar ve açık belirsizlikler.</p></div>
    {error !== undefined && <Card><p role="alert">{errorTr(error)}</p></Card>}
    {!view && !error && <Loading text="Rapor oturumu yükleniyor"/>}
    {view && report && <>
      <div className="report-grid"><div><Card title="Risk özeti"><p className="text-sm font-semibold mb-3">{view.analysis.status === 'INTERRUPTED' ? statusTr.INTERRUPTED : statusTr[report.status]}</p><Score report={report} stale={view.session.invalidated}/><div className="stats"><div><strong>{report.findings.length}</strong><span>Doğrulanmış bulgu</span></div><div><strong>{report.rejectedFindingCount}</strong><span>Dışlanan bulgu</span></div><div><strong>{report.coverage.analyzedChunks.length}/{report.coverage.totalChunks}</strong><span>İncelenen parça</span></div></div></Card>
      <Card title="Doğrulanmış bulgular">
        <p className="text-sm text-slate-600 mb-5">Alıntı doğrulaması, metnin kaynakta bulunduğunu gösterir; yorumun hukuken doğru olduğunu garanti etmez.</p>
        {!report.findings.length && <p>Doğrulanmış bulgu yok. Belirsiz veya eksik bir raporda bu durum güvenlik kanıtı değildir.</p>}
        {report.findings.map((finding, index) => <article className="finding" key={finding.findingId}>
          <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-lg">{index + 1}. {CATEGORIES[finding.category].titleTr}</h3><span className={`severity severity-${finding.severity.toLowerCase()}`}>{severityTr[finding.severity]}</span></div>
          <p className="mt-3">{finding.explanationTr}</p><p className="text-sm text-slate-600 mt-2">{finding.reasonTr}</p>
          <p className="eyebrow mt-5">ÖZGÜN ALINTI</p><blockquote lang="und">{finding.quote}</blockquote>
          <p className="text-xs text-slate-600">Kaynak bölümü: {finding.evidence.sourceLocator.headingPath.join(' › ') || 'Başlık yok'} · Metin konumu: {finding.evidence.start}–{finding.evidence.end}</p>
          <p className="text-xs text-slate-500 break-all mt-1">Kaynak parça: {finding.sourceChunkId}</p>
          <div className="flex justify-between items-center gap-3 mt-4"><span className="evidence-label">✓ Alıntı ve kaynak sürümü doğrulandı</span><button className="button secondary w-auto" onClick={() => void source(finding.findingId)}>Kaynağa Git</button></div>
        </article>)}
        {sourceMessage && <p className="notice" role="status" data-testid="source-message">{sourceMessage}</p>}
      </Card></div>
      <aside><Card title="Belge bilgileri"><dl className="metadata"><dt>Başlık</dt><dd>{view.document.title}</dd><dt>Özgün adres</dt><dd className="break-all">{view.document.url}</dd><dt>Belge türü</dt><dd>{documentTypeTr[view.document.documentType]}</dd><dt>Analiz tarihi</dt><dd>{new Date(report.analyzedAt).toLocaleString('tr-TR')}</dd><dt>Çıkarım durumu</dt><dd>{extractionTr[view.document.extraction.status]}</dd><dt>Belge sürümü</dt><dd className="font-mono text-xs break-all">{report.documentHash}</dd></dl>{view.session.invalidated && <p className="notice mt-3">Kaynak sekme veya belge sürümü değişti. Bu kayıt güncel sayfaya ait bir değerlendirme değildir.</p>}</Card>
      <Card title="Analiz ayrıntıları"><dl className="metadata"><dt>Çıkarım kapsamı</dt><dd>{extractionTr[report.coverage.extractionStatus]}</dd><dt>Analiz kapsamı</dt><dd>{statusTr[report.status]}</dd><dt>Başarısız / bekleyen parçalar</dt><dd>{report.coverage.failedChunks.length} / {report.coverage.pendingChunks.length}</dd><dt>Metin grupları</dt><dd>{report.coverage.batches.filter(batch => batch.status === 'COMPLETE').length} / {report.coverage.batches.length} tamamlandı</dd><dt>Süre</dt><dd>{(report.durationMs / 1000).toFixed(1)} saniye</dd><dt>Model</dt><dd>{report.modelInfo.model}</dd><dt>Sağlayıcı / bağlam</dt><dd>Yerel Ollama / {report.modelInfo.contextSize} belirteç</dd></dl></Card>
      {!!report.unresolvedIssues.length && <Card title="Çözümlenmemiş konular"><ul className="list-disc pl-4 space-y-3 text-sm">{report.unresolvedIssues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></Card>}
      {(report.warnings.length > 0 || view.document.extraction.coverage.unopenedSections.length > 0) && <Card title="Kapsam uyarıları"><p className="text-sm">Erişilebilir metin değerlendirilmiştir. Kısıtlı veya açılmamış bölümler ve işlem hataları tam değerlendirmeyi engelleyebilir.</p>{report.warnings.map((warning, index) => <p className="text-sm mt-2" key={index}>{/accessible legal|completeness|coverage/i.test(warning) ? 'Belgenin tamamlığı doğrulanamadı.' : errorTr(warning)}</p>)}</Card>}
      </aside></div>
    </>}
    <Disclaimer/>
  </main>;
}
