# YouTube video bilgileri

## Başlık

ClauseGuard | Yerel Yapay Zekâ ile Sözleşme Risk Analizi (Chrome Uzantısı)

## Açıklama

ClauseGuard, kullanım koşulları, gizlilik politikaları ve abonelik sözleşmelerindeki olası riskleri kaynak alıntılarıyla gösteren bir Chrome uzantısıdır. Software Implementation and Testing üniversite projesi kapsamında geliştirilmiştir.

Bu 80 saniyelik videoda iki gerçek test gösteriliyor:
1. Alibaba Page Agent kapalı sözleşme bölümünü açıyor. Ollama üzerinde çalışan yerel Qwen modeli metni analiz ediyor; kaynak alıntıları doğrulanıyor ve deterministik risk puanı ile Türkçe rapor oluşturuluyor.
2. Belgenin kapsamı eksik olduğunda uygulama güvenilir bir sayısal puan vermiyor ve belirsizliği kullanıcıya açıklıyor.

Cypress ile kaydedilen iki test de geçti. Videodaki model yanıtları ve Page Agent etkileşimleri gerçektir; yapay test yanıtları kullanılmamıştır. Bekleme bölümleri kısaltılmıştır.

Teknolojiler: TypeScript, WXT, React, Chrome Manifest V3, Alibaba Page Agent, Ollama ve Qwen3.5 9B Q4_K_M. Yerel model NVIDIA RTX 4060 Laptop GPU ile doğrulanmıştır. Projede llms.txt desteği, MCP stdio sunucusu ve prompt injection güvenlik testleri de bulunmaktadır; bu videoda ayrı bir prompt injection senaryosu gösterilmez.

Kaynak kod, kurulum, test sonuçları ve bilinen sınırlamalar:
https://github.com/Miku-erm/clauseguard

ClauseGuard hukuki tavsiye vermez. AI yorumları hatalı olabilir; puanlar sezgisel uyarılardır ve uzman değerlendirmesinin yerini tutmaz. Kayıtlı değerlendirme sonuçları ve tamamlanmamış kontroller depoda açıkça belirtilmiştir.

#ClauseGuard #ChromeExtension #LocalAI #Ollama #TypeScript
