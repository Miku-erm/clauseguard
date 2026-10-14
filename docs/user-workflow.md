# ClauseGuard P3 kullanıcı akışı

## Chrome'da açma

1. `Challenge3` klasöründe `npm run ollama:start`, ardından `npm run build` çalıştırın. Kurulu modeli yeniden indirmeyin.
2. Chrome'da `chrome://extensions` → geliştirici modu → paketlenmemiş uzantı yükle → `.output/chrome-mv3` seçin.
3. `npm run fixture` çalıştırın ve `http://127.0.0.1:4173/p2/renewal.html` açın.
4. Uzantının gerçek araç çubuğu simgesini kullanın. Popup, etkin sekmenin başlığını ve URL'sini göstermeli.
5. **Belgeyi Tara**: yalnızca erişilebilir sözleşme metni çıkarılır. Tamlık bilinmiyorsa açıkça belirtilir. İzin verilmeyen sitelerde otomatik tıklama yapılmaz.
6. Tek belge hazırsa **Risk Analizi Yap**: yerel model yüklenir; GPU yerleşimi kontrol edilir; gerçek grup ilerlemesi gösterilir. Bu işlem açık bir kullanıcı eylemi gerektirir.
7. Popup dışına tıklayıp kapatın. Yeniden açınca aynı işin durumu gelmeli; ikinci analiz başlatılmamalı. İsterseniz **Risk Analizini İptal Et** kullanın.
8. **Ayrıntılı Raporu Aç**: tüm doğrulanmış bulgular, özgün alıntılar, kapsam ve belirsizlikler gösterilir. Puan yalnızca motorun uygun tam değerlendirmesinde görünür.
9. **Kaynağa Git**: orijinal sekme ve belge sürümü doğrulanır, tam alıntı sekiz saniye vurgulanır. Sayfa değişmişse yeniden tarayın.
10. **Ayarlar** → **Bağlantıyı Sına** yalnızca kurulu model envanterini sorgular. GPU kanıtı değildir. **Yerel Verileri Temizle** onayından sonra tarama/rapor/tanılamayı kaldırır; devam eden işlem önce iptal edilmelidir.

## Sonuçları anlama

Puan: 0–19 Düşük uyarı; 20–39 Dikkat; 40–69 Yüksek uyarı; 70–100 Kritik uyarı. Bunlar hukuki uygunluk notu veya ihlal ihtimali değildir. Sıfır, yalnızca incelenen metinde doğrulanmış riskli madde bulunmadığını söyler.

“Güvenilir risk puanı hesaplanamadı.” ifadesi sıfır demek değildir. Eksik/bilinmeyen çıkarım, başarısız/bekleyen gruplar, desteklenmeyen bulgu veya çözümlenmemiş yorum ve kesinti olabilir. Doğrulanmış kısmi bulgular ayrıca gösterilir; tüm belge değerlendirmesi sayılmaz. Reddedilen öneriler doğrulanmış hukuki sorun olarak sunulmaz. Tam alıntı eşleşmesi, modelin yorumunun doğru olduğunu kanıtlamaz.

Her ekranda “Bu uygulama hukuki tavsiye vermez.” açıklaması bulunur.

## Hata ve toparlanma

| Durum | Beklenen kullanıcı davranışı |
| --- | --- |
| Ollama kapalı | Bağlantı kurulamadı; sunucuyu başlatıp bağlantıyı sınayın. |
| Model kurulu fakat yüklenmemiş | Envanter bağlı görünebilir; bu GPU hazır demek değildir. Analiz modeli yükler ve yerleşimi doğrular. |
| Model bulunmuyor / yanıt geçersiz | Kurulum veya yanıt hatası; desteklenmeyen sonuç puanlanmaz. |
| Belge bulunamadı | Yeterli sözleşme metni bulunamadı; normal görünür sözleşme sayfasını açın. |
| Belirsiz/bilinmeyen kapsam | Kapsam uyarısı; tam belge puanı gösterilmez. |
| Page Agent başarısız | Tarama başarısız; onaylı fixture dışına tıklama yetkisi genişletilmez. |
| Chrome/file/uzantı sayfası | Tarama devre dışı; normal HTTP(S) sayfasına geçin. |
| İzin yok / içerik betiği yok | Gerçek araç çubuğundan açıp yeniden tarayın; kısıtlı sayfada izin verilemez. |
| Sayfa değişti / yeniden yüklendi | Eski kaynağa yönlendirme reddedilir; yeni tarama gerekir. |
| Kaynak sekme kapandı | Kaynak sekme kapatılmış hatası; ilgisiz tab açılmaz veya vurgulanmaz. |
| Kaynak tek konuma çözümlenemiyor | Yönlendirme kullanılamaz; sahte vurgu yoktur. |
| Kullanıcı iptal etti | Eksik iş tamamlanmış sayılmaz; puan yoktur. |
| Service Worker kesildi | Son kayıt/kapsam gösterilir, iş açıkça kesintili olur; yeniden başlatma gerekir. |
| Yeni sekmede popup açıldı | Önceki siteye ait rapor bu siteye iliştirilmez. |

## Gerçek site erişimi ve manual Chrome kontrolü

Wikimedia gizlilik sayfasında otomatik Chromium uzantı eylemiyle geçici activeTab ve salt okunur çıkarım ölçüldü; Page Agent veya AI çağrılmadı. Genel site kapsamı PARTIAL/UNKNOWN kalabilir. Mozilla'nın “Privacy Notice” başlığı mevcut P1 tanıyıcısıyla belge olarak tanınmadı; P3 bu tanıyıcıyı değiştirmez.

Otomatik testler gerçek MV3 paketini kullanır; rapor/popup HTML test sekmesi, kapanıp açılma, kaynak Range, izin ve kesinti kanıtları ayrı kaydedilir. Marka Chrome kurulu veya native envanterde bulunamadığı için manuel Chrome araç çubuğu kontrolü BLOCKED'dır. Yukarıdaki 1–10 adımları gerçek Chrome'da uygulayıp etkin URL, aynı iş UUID'si, tam alıntı ve eski kaynak hatasını gözleyerek bu kalan kontrolü tamamlayın. Otomatik CDP eylemi manuel fare kontrolü olarak sunulmaz.

Bu P3 prototipidir. P4 güvenlik/gold-label değerlendirmesi, MCP, llms.txt, nihai Cypress videosu ve yayın yapılmadı.
