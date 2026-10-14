# Final five-contract evaluation

Reuses authentic recorded evaluation. No new five-document inference. All metrics PROVISIONAL; eight direct-reading draft labels, zero human/expert approvals. Controlled demo fixtures are separate and do not replace these sources.

| Source / official URL | Accessed (UTC) | Recorded extraction | Extracted chunks |
|---|---|---|---:|
| [github](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) | 2026-10-13T20:43:04.530Z | PARTIAL | 254 |
| [discord](https://discord.com/terms) | 2026-10-13T20:43:07.055Z | UNKNOWN | 188 |
| [reddit](https://redditinc.com/policies/user-agreement) | 2026-10-13T20:44:22.692Z | UNKNOWN | 71 |
| [spotify](https://www.spotify.com/tr-tr/legal/end-user-agreement/) | 2026-10-13T20:43:10.435Z | UNKNOWN | 170 |
| [dropbox](https://www.dropbox.com/terms) | 2026-10-13T20:43:13.507Z | UNKNOWN | 97 |

## Separate experiments

| Experiment | Inference scope | TP | FP | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|
| P4 baseline | Full extracted-text run; partial source/analysis coverage | 4 | 6 | 4 | 40.00% | 50.00% | 44.44% |
| P4.1 candidate | Selected-reference-batch pilot; 8 fresh calls | 4 | 4 | 4 | 50.00% | 50.00% | 50.00% |

Do not claim an exhaustive full-run improvement from these different inference scopes. P4 completed 238/242 batches and 757/780 chunks in approximately 49.58 minutes with 246 calls. Eight 1536-token capped responses caused four failed batches. P4.1 final full run was not performed. Its later delivery prompt explicitly allows reuse of the original five-source evidence.

## Method and trust limits

Official public pages were captured without login or restriction bypass. Regional/version branches remain pinned; Reddit uses only the recorded US/non-EEA branch. Source document and HTML hashes, URL/date/version and coverage are preserved in evaluation/sources.json and evaluation/p4.1/source-manifest.json. Private original snapshots remain ignored in .local/p4/real.

An exact original quote is independently verified before acceptance. Selected-reference metrics require document/category/chunk/span agreement plus an independently recorded, prediction-fingerprinted semantic-support draft review; one-to-one matching prevents duplicate true positives. Unannotated corpus findings are unscored. Unmatched predictions may reflect reference gaps, rather than proven false legal claims. No untouched holdout is claimed.

## Detected and missed reference risks (P4.1 pilot)

| Source | TP / FP / FN | Missed references |
|---|---|---|
| github | 1/0/0 | none |
| discord | 1/1/1 | draft-3 |
| reddit | 0/1/1 | draft-8 |
| spotify | 1/1/1 | draft-5 |
| dropbox | 1/1/1 | draft-6 |

Supported pilot interpretations include advance-paid no-refund restrictions, qualified damages exclusions/caps and conditional partial-period refunds. Residuals include an omitted Discord cap, duplicate Discord exclusion, Reddit exception loss, a Spotify payment lookback incorrectly called a claim deadline, and Dropbox cancellation/refund conflation. Exact errors and source extracted/analyzed/rejected state are in candidate-metrics.json; rationales are in candidate-semantic-reviews.json.

## Representative original excerpts

These short literal excerpts are illustrative, not substitutes for surrounding exceptions or whole clauses. Full context and review rationale are in docs/gold-label-review.md.

### github

> Payment Based on Plan For monthly or yearly payment plans, the Service is billed in advance on a monthly or

Draft category: DIFFICULT_CANCELLATION_OR_REFUND. Source hash: `88f85845caf52f3f0c5b2ca7862589cd78f35256e0115a281d7547854660b271`. Review: PENDING_HUMAN_REVIEW.

### discord

> IN JURISDICTIONS WHERE EXCLUSIONS OR LIMITATIONS OF LIABILITY ARE ALLOWED, NEITHER DISCORD, ITS AFFILIATES, NOR OUR SUPPLIERS INVOLVED IN CREATING,

Draft category: LIMITATION_OF_LIABILITY. Source hash: `d8a787422698ac39949615715a78f06985db7346f4bd77e0c3abe4d344faeec5`. Review: PENDING_HUMAN_REVIEW.

### reddit

> Nothing in these Terms will prejudice the statutory rights that you may have as a user of the Services. Some

Draft category: LIMITATION_OF_LIABILITY. Source hash: `a6d182b4aa6bac3bf3c629db787391a217f933d70a2c5664c9c6ed541295b6a9`. Review: PENDING_HUMAN_REVIEW.

### spotify

> Ücretli Aboneliğinizi, Spotify hesabınızda oturum açıp Hesap sayfasındaki yönergeleri izleyerek veya bu bağlantıya tıklayıp talimatları uygulayarak istediğiniz zaman iptal edebilirsiniz.

Draft category: DIFFICULT_CANCELLATION_OR_REFUND. Source hash: `401d734db094bd386eeae685f497ccff9dfd663d78ce5c67a1f7335f2cc1f100`. Review: PENDING_HUMAN_REVIEW.

### dropbox

> Cancellation. You may cancel your Paid Account at any time. Refunds are only issued if required by law. For example,

Draft category: DIFFICULT_CANCELLATION_OR_REFUND. Source hash: `26d95f6839e56300785f89845f1496335e4819c8b0e1392fd15bc9c857d01c23`. Review: PENDING_HUMAN_REVIEW.

## Coverage and legal disclaimer

Extraction UNKNOWN/PARTIAL cannot authorize a complete-contract numeric score. Completing every extracted chunk would still not prove full website completeness. All five real-source complete-document scores remain withheld. Sparse annotations, severity disagreement, translation errors and model variability limit generalization. Bu uygulama hukuki tavsiye vermez.
