# P1 document extraction and source evidence

P1 reads the current document, identifies plausible legal regions and creates evidence. It does not evaluate clauses, score risks or generate a legal report. The modules in `src/extraction/` depend on DOM interfaces and Web Crypto, not Chrome APIs. Zod validates the document and source schemas. No new dependency was installed.

## Boundaries and identification

English/Turkish legal headings identify privacy policies, service/use terms and subscription terms. Semantic articles are preferred, then main landmarks, then a body fallback when title/path/headings suggest a legal document. URL/title signals do not establish completeness. Legal link labels are reported on insufficient landing pages; links are never automatically followed. A non-heading text chunk longer than 40 characters is the conservative operational sufficiency rule; it is not a legal authenticity or completeness classifier. Identification can produce false positives or miss unusual terminology.

Distinct legal articles stay separate. Multiple candidates produce ambiguity, `PARTIAL`, and no selected document. Semantic section containers within a selected region are visited in DOM order. Paragraphs, headings, list items (including nested lists), definition lists, quotations, tables and plain container text are retained. Inline text nodes preserve original order. Legal asides and footers inside a semantic legal region remain evidence; site footers outside the selected region and body-fallback footers are excluded.

Excluded subtrees are navigation, forms and their values, controls, scripts/styles/templates/noscript, dialogs, explicitly marked advertising/cookie banners and developer exclusion regions. No form values are read. CSS/HTML/ARIA-hidden source is not treated as visible extracted evidence. Hidden legal headings, paragraphs and sections are recorded as unopened coverage, so missing legal content is not quietly called complete. Hidden nonlegal instructions are excluded. These are explicit boundary rules, not a universal website boilerplate classifier.

## Original text and normalization

`SourceChunk.text` is the exact concatenation of eligible DOM text-node values. It is not HTML serialization or a translation. HTML entities have already been decoded by the browser. DOM `<br>` and layout-generated line breaks are not text-node characters; this version does not reproduce rendered typography. `analysisText` separately normalizes CRLF/CR to LF, NBSP to space, collapses horizontal whitespace, removes indentation around line breaks and trims outer whitespace. It does not remove negations, exceptions or qualifications. Original English remains English. Script/HTML content is never executed by extraction.

Each semantic block starts a chunk. Default maximum is 2,400 original characters, configurable in `extractDocuments`. Only an overlong block is split: sentence punctuation is preferred, then whitespace. Original characters and ordering are preserved. An indivisible long token is retained beyond the limit with a warning, rather than cut. A contract can have arbitrarily many chunks; an 8192-token model context does not limit extraction. No contract chunks are sent to the discovery model.

## Traceability and version identity

`sourceLocator` has a structural selector, heading path, offsets in the eligible block text, and exact text-node child paths plus local offsets. Node segments are authoritative when excluded inline descendants create gaps. `readLocatedText` reconstructs source text for independent quotation checks. Structural selectors distinguish duplicate IDs and paragraphs but cannot remain permanent through arbitrary DOM edits: verify the reconstructed text and SHA-256 before highlighting or quoting a later version.

`textHash` hashes original chunk text. `contentHash` hashes ordered source blocks, locations and heading paths. `documentId` hashes URL, type and content version; chunk IDs additionally include document ID, order and text hash. Duplicate paragraphs share a text hash but have distinct chunk IDs and locations. `createdAt` is metadata and does not affect any content hash. Unrelated excluded content is absent from content hashes; structural changes that shift locations can create a new version.

## Coverage

`COMPLETE` is restricted to exact developer-owned fixture URLs whose root and every independently specified expected heading/paragraph are visible, unchanged and extracted. Expected records live in `fixture-expectations.ts`, separate from page HTML and cannot be set by messages or page attributes. Every extracted chunk is also verified against the real DOM in browser tests.

`PARTIAL` reports known missing/changed expected blocks, unopened legal regions or ambiguous documents. `UNKNOWN` means useful accessible text exists without an independently verified section inventory. `FAILED` covers an empty candidate; a landing page with no candidate produces no document and reflex `INSUFFICIENT`. Coverage exposes detected/extracted/unopened sections, known missing blocks, excluded regions, warnings and uncertainty. All processed chunks alone never justify `COMPLETE`.

Fixtures A–H are `visible`, `hidden`, `multiple`, `long`, `landing`, `noisy`, `dynamic`, `injection`. Additional ambiguity/partial fixtures and unregistered URL aliases test fallback behavior. The long fixture has 180 clauses plus its title. Dynamic coverage is partial before its known delayed paragraph exists, then complete after insertion. Injection text is preserved as data and cannot change deterministic routing.

## Limits

Only the current top document is read. PDFs, cross-page documents, frames, closed shadow roots, virtualized/offscreen content not yet inserted and arbitrary delayed updates are not reconstructed. General websites remain `UNKNOWN`/`PARTIAL`. Web Crypto requires an available secure context; localhost fixtures meet this requirement. General-site activeTab injection depends on an actual toolbar grant and is not proven by the loopback-host browser tests. Very large payloads can exceed Chrome session-storage/message limits; that failure is reported, not truncated. Source text is stored only in `storage.session`, clearable from the popup, not persistent local storage. Development evidence captures only fictional fixtures.
