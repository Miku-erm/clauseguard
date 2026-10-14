import type { ReactNode } from 'react';
import type { RiskReport } from '../risk/schema';
import { scoreView, withholdingReasons } from './presentation';
export function Brand() { return <div className="flex items-center gap-3"><span className="brand-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3 20 6v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" stroke="currentColor" strokeWidth="1.8"/><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.8"/></svg></span><div><h1 className="font-bold tracking-tight text-xl">ClauseGuard</h1><p className="text-xs text-slate-500">Sözleşmenizi anlamanın ilk adımı</p></div></div>; }
export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{title && <h2 className="section-title">{title}</h2>}{children}</section>; }
export function Disclaimer() { return <footer className="disclaimer"><strong>Bu uygulama hukuki tavsiye vermez.</strong><p>Puanlar sezgisel uyarılardır; hukuki uygunluk derecesi veya ihlal olasılığı değildir. Modelin yorum doğruluğu tam olarak kanıtlanmamıştır.</p></footer>; }
export function Score({ report, stale = false }: { report: RiskReport; stale?: boolean }) {
  const view = scoreView(report, stale);
  return <div>{view.eligible ? <div className={`score-row alarm-${report.alarmLevel!.toLowerCase()}`}><span className="score-number" data-testid="risk-score">{view.score}<small>/100</small></span><div><strong>{view.label}</strong><p className="text-sm">{view.score === 0 ? 'İncelenen metinde doğrulanmış riskli madde tespit edilmedi.' : 'İncelenen metne ait sezgisel risk uyarısı'}</p></div></div> : <div className="notice"><strong data-testid="risk-score">{view.label}</strong><ul>{withholdingReasons(report, stale).map(reason => <li key={reason}>{reason}</li>)}</ul><p>Kısmi bulgular, tüm belge için eksiksiz bir değerlendirme değildir.</p></div>}</div>;
}
export function Loading({ text }: { text: string }) { return <div className="flex gap-2 items-center text-sm" role="status"><span className="spinner" aria-hidden="true"/>{text}</div>; }
