# P4 evaluation — PROVISIONAL

Generated 2026-10-13T20:53:35.125Z. Independent draft references have no human approval. Selected reference chunks only; no complete-document score or legal certification. Bu uygulama hukuki tavsiye vermez.

| Document | TP | FP | FN | Precision | Recall | F1 | Analyzed / extracted chunks |
|---|---:|---:|---:|---:|---:|---:|---|
| github | 1 | 0 | 0 | 100.0% | 100.0% | 100.0% | 4/254 (PARTIAL) |
| discord | 2 | 0 | 0 | 100.0% | 100.0% | 100.0% | 7/188 (UNKNOWN) |
| reddit | 0 | 2 | 1 | 0.0% | 0.0% | 0.0% | 1/71 (UNKNOWN) |
| spotify | 1 | 1 | 1 | 50.0% | 50.0% | 50.0% | 4/170 (UNKNOWN) |
| dropbox | 0 | 1 | 2 | 0.0% | 0.0% | 0.0% | 7/97 (UNKNOWN) |

Micro: TP 4, FP 4, FN 4; precision 50.0%, recall 50.0%, F1 50.0%. Macro: precision 50.0%, recall 50.0%, F1 50.0%.

Evidence validity 59.3%; severity agreement 0.0%; 8 original model calls; 0 invalid structured responses; 0 response failures. Unevaluated: none. Unmatched predictions can be reference gaps; see machine-readable error analysis. Zero denominators are null, not perfect negatives.

| Category | TP | FP | FN |
|---|---:|---:|---:|
| THIRD_PARTY_DATA_SHARING | 0 | 0 | 0 |
| TRACKING_AND_PROFILING | 0 | 0 | 0 |
| UNCLEAR_DATA_RETENTION | 0 | 0 | 0 |
| RESTRICTED_USER_RIGHTS | 0 | 1 | 0 |
| AUTOMATIC_RENEWAL | 0 | 0 | 0 |
| DIFFICULT_CANCELLATION_OR_REFUND | 2 | 0 | 1 |
| UNILATERAL_TERMS_CHANGES | 0 | 0 | 0 |
| LIMITATION_OF_LIABILITY | 2 | 3 | 3 |

- [github](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service): Effective April 27, 2026; accessed 2026-10-13T20:43:04.530Z; GitHub standard individual-user terms; US/California provisions; source hash 88f85845caf52f3f0c5b2ca7862589cd78f35256e0115a281d7547854660b271.
- [discord](https://discord.com/terms): Effective September 29, 2025; accessed 2026-10-13T20:43:07.055Z; General terms with region-specific dispute provisions; source hash d8a787422698ac39949615715a78f06985db7346f4bd77e0c3abe4d344faeec5.
- [reddit](https://redditinc.com/policies/user-agreement): Effective July 1, 2026; revised May 26, 2026; accessed 2026-10-13T20:44:22.692Z; US and outside EEA/UK/Switzerland ONLY; EEA branch excluded; source hash a6d182b4aa6bac3bf3c629db787391a217f933d70a2c5664c9c6ed541295b6a9.
- [spotify](https://www.spotify.com/tr-tr/legal/end-user-agreement/): Last updated August 26, 2025 (Son Güncelleme: 26 Ağustos 2025); accessed 2026-10-13T20:43:10.435Z; tr-tr Turkish regional version; source hash 401d734db094bd386eeae685f497ccff9dfd663d78ce5c67a1f7335f2cc1f100.
- [dropbox](https://www.dropbox.com/terms): Effective January 7, 2025; accessed 2026-10-13T20:43:13.507Z; General consumer terms; regional exceptions retained, announced 2027 version not followed; source hash 26d95f6839e56300785f89845f1496335e4819c8b0e1392fd15bc9c857d01c23.

Full snapshots, predictions and native traffic remain in ignored .local/p4. Public evidence contains metadata and exact span references only.
