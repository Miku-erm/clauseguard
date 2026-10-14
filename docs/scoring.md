# P2 deterministic heuristic scoring

Definitions are centralized in `src/risk/categories.ts`, including Turkish titles/descriptions, scope guidance, relevant document types and supported/unsupported examples. Categories are potential contractual disadvantages, not legal findings. Sharing, renewal and liability limitations are not automatically unlawful or unfair. Privacy concerns and general subscription/contract conditions are distinguished; no category establishes KVKK noncompliance.

| Category | Turkish title | Maximum weight |
| --- | --- | ---: |
| THIRD_PARTY_DATA_SHARING | Üçüncü taraflarla veri paylaşımı | 20 |
| TRACKING_AND_PROFILING | Takip ve profilleme | 15 |
| UNCLEAR_DATA_RETENTION | Belirsiz veri saklama | 14 |
| RESTRICTED_USER_RIGHTS | Kullanıcı haklarının kısıtlanması | 17 |
| AUTOMATIC_RENEWAL | Otomatik yenileme | 20 |
| DIFFICULT_CANCELLATION_OR_REFUND | İptal veya iade güçlüğü | 18 |
| UNILATERAL_TERMS_CHANGES | Tek taraflı koşul değişikliği | 14 |
| LIMITATION_OF_LIABILITY | Sorumluluğun sınırlandırılması | 12 |

LOW uses 0.4 for limited/qualified disadvantage; MEDIUM 0.7 for meaningful conditional disadvantage; HIGH 1.0 for broad, significant or difficult-to-reverse disadvantage. The model proposes severity; Zod validates the allowed value. Application code computes scores; no numeric score is requested from the model.

For each category take its maximum accepted severity multiplier times weight. Compute integer tenths (`weight * 4`, `*7`, `*10`) to avoid floating-point accumulation. Category contributions retain one decimal place. Sum tenths, round the final total to nearest integer with halves upward, then cap at 100. Category weights total 130, so the cap is meaningful. Duplicates never increase category maximums.

| Final integer score | Alarm |
| ---: | --- |
| 0–19 | LOW |
| 20–39 | CAUTION |
| 40–69 | HIGH |
| 70–100 | CRITICAL |

Examples: MEDIUM automatic renewal contributes 14 → LOW alarm. HIGH cancellation contributes 18 → LOW alarm. MEDIUM restricted rights contributes 11.9, final 12. The severity of an individual finding and aggregate alarm are different; these exact user-specified thresholds are retained. All categories HIGH cap at 100. Empty verified findings on an eligible complete/fully analyzed document score 0.

Eligibility is conservative: COMPLETE verified extraction, all required batches/chunks successful, no rejected evidence, unresolved issues or critical processing failure. Otherwise score and alarm are null, category scores are empty and withholding reasons are explicit. Valid discovered findings remain visible. An unknown/incomplete document does not become a low-risk zero merely because nothing was found. Intermediate checkpoints and interrupted jobs cannot expose final scores.

The same accepted findings/configuration produce identical scores regardless of order. This determinism does **not** make the model deterministic across runs or make its risk interpretation correct. Scores are heuristic warnings, not probabilities, legal advice or compliance certificates.
