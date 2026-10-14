import type { RiskReport } from '../risk/schema';
import type { Connection } from '../llm/provider';
export const statusTr: Record<string, string> = {
  INSPECTING: 'Sayfa kontrol ediliyor', EXTRACTING: 'Sözleşme metni çıkarılıyor', DISCOVERING: 'Page Agent çalışıyor', PREPARING: 'Metin parçaları hazırlanıyor',
  ANALYZING: 'Yapay zekâ analizi yapılıyor', RUNNING: 'Analiz devam ediyor', INTERRUPTED: 'Analiz kesintiye uğradı',
  READY: 'Belge hazır', PARTIAL: 'Kısmen tamamlandı', COMPLETE: 'Analiz tamamlandı', INSUFFICIENT: 'Yeterli sözleşme metni bulunamadı', FAILED: 'İşlem başarısız', FINISHED: 'İşlem tamamlandı',
  UNKNOWN: 'Kapsam doğrulanamadı', PASS: 'Başarılı', FAIL: 'Başarısız', IDLE: 'Henüz taranmadı', DONE: 'İşlem tamamlandı',
};
export const severityTr = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek' };
export const alarmTr = { LOW: 'Düşük uyarı', CAUTION: 'Dikkat', HIGH: 'Yüksek uyarı', CRITICAL: 'Kritik uyarı' };
export const documentTypeTr = { privacy_policy: 'Gizlilik politikası', terms_of_service: 'Kullanım koşulları', subscription_terms: 'Abonelik koşulları', unknown: 'Belge türü belirsiz' };
export const extractionTr = { COMPLETE: 'Çıkarım tamamlandı', PARTIAL: 'Çıkarım kısmi', UNKNOWN: 'Çıkarım kapsamı bilinmiyor', FAILED: 'Çıkarım başarısız' };
export function pageAccessibility(url?: string): { allowed: boolean; text: string } {
  if (!url) return { allowed: false, text: 'Sayfa bilgisine erişilemiyor. Uzantıyı site üzerindeki araç çubuğundan açın.' };
  try { if (['http:', 'https:'].includes(new URL(url).protocol)) return { allowed: true, text: 'Kullanıcı isteğiyle salt okunur tarama yapılabilir.' }; } catch { /* unsupported */ }
  return { allowed: false, text: 'Bu sayfa taranamaz. Normal bir HTTP veya HTTPS sayfası açın.' };
}
export function errorTr(error: unknown): string {
  const text = String(error);
  if (/SOURCE_TAB_CLOSED|No tab with id/i.test(text)) return 'Kaynak sekme kapatılmış. Belgeyi yeniden açıp tarayın.';
  if (/SOURCE_VERSION_CHANGED|Stale|navigation|SOURCE_LOCATOR_CHANGED|SOURCE_QUOTE_CHANGED|document identity/i.test(text)) return 'Sayfa veya kaynak belge değişmiş. Yanlış metni vurgulamamak için işlem durduruldu; yeniden tarayın.';
  if (/SOURCE_NOT_UNIQUE/.test(text)) return 'Kaynak alıntı tek bir konuma çözümlenemedi. Kaynağa yönlendirme kullanılamıyor.';
  if (/SOURCE_HIGHLIGHT_UNSUPPORTED/.test(text)) return 'Bu tarayıcı güvenli metin vurgulamayı desteklemiyor.';
  if (/SOURCE_UNAVAILABLE|Receiving end|Could not establish connection/i.test(text)) return 'Kaynak konumu bulunamadı veya içerik betiğine erişilemiyor. Sayfayı yeniden tarayın.';
  if (/REPORT_UNAVAILABLE|REPORT_IDENTITY_MISMATCH/.test(text)) return 'Bu rapor oturumu artık kullanılabilir değil. İlgili sekmede yeni bir tarama başlatın.';
  if (/interrupted|Service Worker/i.test(text)) return 'Arka plan oturumu kesintiye uğradı. Son kayıt korundu; analizi açıkça yeniden başlatın.';
  if (/cancel|abort/i.test(text)) return 'İşlem iptal edildi. Tam belge değerlendirmesi tamamlanmadı.';
  if (/timeout|deadline/i.test(text)) return 'İşlem zaman sınırına ulaştı. Yerel bağlantıyı kontrol edip yeniden deneyin.';
  if (/GPU|residency|context.*8192/i.test(text)) return 'GPU yerleşimi veya 8192 bağlamı doğrulanamadı. Tanılama adımlarını uygulayın; CPU yedeğine geçilmedi.';
  if (/missing.*model|model missing|Authorized model missing/i.test(text)) return 'İzin verilen Qwen modeli Ollama envanterinde bulunamadı. Kurulum yönergesini kontrol edin.';
  if (/Ollama|provider|fetch|HTTP/i.test(text)) return 'Yerel Ollama bağlantısı veya model yanıtı başarısız. Ollama’yı başlatın ve bağlantıyı sınayın.';
  if (/permission|Cannot access|extensions gallery|access contents/i.test(text)) return 'Sayfa erişim izni yok. Uzantıyı bu sitenin araç çubuğundan açın; kısıtlı sayfalar taranamaz.';
  if (/OPERATION_RUNNING|Another|running operation/i.test(text)) return 'Başka bir işlem devam ediyor. Bitmesini bekleyin veya iptal edin.';
  if (/single extracted|ambiguous/i.test(text)) return 'Analiz için aynı sekmede tek bir sözleşme seçilebilir olmalı. Belgeyi yeniden tarayın.';
  if (/structured|schema|validation|response/i.test(text)) return 'Model yanıtı doğrulanamadı. Desteklenmeyen sonuçlar değerlendirmeye alınmadı.';
  return 'İşlem tamamlanamadı. Sayfayı ve yerel bağlantıyı kontrol edip yeniden deneyin.';
}
export function connectionTr(connection?: Connection): string {
  if (!connection) return 'Yerel bağlantı kontrol ediliyor';
  return connection.connected ? 'Ollama bağlı · Qwen modeli kurulu' : /model missing/.test(connection.detail) ? 'Qwen modeli kurulu değil' : 'Ollama bağlantısı kurulamadı';
}
export function scoreView(report: RiskReport, stale = false) {
  const eligible = !stale && report.status === 'COMPLETE' && report.coverage.extractionStatus === 'COMPLETE' && !report.rejectedFindingCount && !report.unresolvedIssues.length && !report.coverage.failedChunks.length && !report.coverage.pendingChunks.length && report.coverage.totalChunks > 0 && new Set(report.coverage.analyzedChunks).size === report.coverage.totalChunks && report.coverage.batches.every(batch => batch.status === 'COMPLETE') && report.score !== null && report.alarmLevel !== null;
  return { eligible, score: eligible ? report.score : null, label: eligible ? alarmTr[report.alarmLevel!] : 'Güvenilir risk puanı hesaplanamadı.' };
}
export function withholdingReasons(report: RiskReport, stale = false): string[] {
  const reasons: string[] = [];
  if (stale) reasons.push('Kaynak sekme kapatılmış veya belge sürümü değişmiş; bu kayıt güncel sayfayı değerlendirmez.');
  if (report.coverage.extractionStatus !== 'COMPLETE') reasons.push('Belge çıkarımının tamamlığı doğrulanamadı; erişilemeyen bölümler bulunabilir.');
  if (report.coverage.failedChunks.length || report.coverage.pendingChunks.length) reasons.push('Tüm metin parçaları başarıyla incelenmedi.');
  if (report.rejectedFindingCount) reasons.push(`${report.rejectedFindingCount} desteklenmeyen bulgu dışlandı; bunlar doğrulanmış hukuki sorunlar değildir.`);
  if (report.unresolvedIssues.length) reasons.push('Çözümlenmemiş yorum veya bağlam belirsizlikleri var.');
  if (report.status === 'FAILED' || /interrupted|cancel|stale/i.test(report.scoreWithheldReason ?? '')) reasons.push(errorTr(report.scoreWithheldReason));
  if (!reasons.length && report.score === null) reasons.push('Güvenilir tam belge değerlendirmesi için yeterli doğrulanmış sonuç yok.');
  return reasons;
}
