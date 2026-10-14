import { contractDocumentSchema, type ExtractionResult, type SourceChunk } from './schema';
import { identifyDocuments } from './identify';
import { identifyType } from './identify';
import { selectorFor, nodePath } from './locator';
import { hashText, normalizeText, splitText } from './text';
import { fixtureExpectation } from './fixture-expectations';

const excludedSelector = 'nav,[role="navigation"],form,input,textarea,select,button,script,style,template,noscript,[role="dialog"],[data-ad],[data-cookie-banner],.cookie-banner,.ad-banner,.advertisement,[data-clauseguard-exclude]';
const blockTags = /^(H[1-6]|P|LI|DT|DD|BLOCKQUOTE|PRE|TD|TH)$/;
export function isVisible(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') return false;
    if (current.tagName === 'DETAILS' && !current.hasAttribute('open') && !element.closest('summary')) return false;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
  }
  return true;
}
interface Block { element: Element; text: string; nodes: Array<{ node: Node; start: number; end: number }>; headingPath: string[]; heading?: string }
function collectBlocks(root: Element): { blocks: Block[]; excluded: string[] } {
  const blocks: Block[] = []; const excluded = new Set<string>(); const headings: string[] = [];
  function excludedElement(element: Element): boolean {
    if (element.tagName === 'FOOTER' && root === root.ownerDocument.body) { excluded.add(selectorFor(element)); return true; }
    if (element.matches(excludedSelector) || !isVisible(element)) { excluded.add(selectorFor(element)); return true; }
    // A footer within a legal region is evidence. Site-wide footers outside it are never traversed.
    return false;
  }
  function walk(element: Element): void {
    if (excludedElement(element)) return;
    const semantic = blockTags.test(element.tagName);
    let text = ''; let nodes: Block['nodes'] = [];
    function flush(): void {
      if (!normalizeText(text)) { text = ''; nodes = []; return; }
      let heading: string | undefined;
      if (/^H[1-6]$/.test(element.tagName)) {
        const level = Number(element.tagName[1]); headings.length = level - 1; headings[level - 1] = normalizeText(text); heading = normalizeText(text);
      }
      blocks.push({ element, text, nodes, headingPath: headings.filter(Boolean), ...(heading ? { heading } : {}) }); text = ''; nodes = [];
    }
    function visit(node: Node): void {
      if (node.nodeType === 3) { const value = node.textContent ?? ''; nodes.push({ node, start: text.length, end: text.length + value.length }); text += value; return; }
      if (node.nodeType !== 1) return;
      const child = node as Element;
      if (excludedElement(child)) return;
      const isBlock = blockTags.test(child.tagName) || /^(DIV|SECTION|ARTICLE|MAIN|UL|OL|DL|FOOTER|HEADER|DETAILS)$/.test(child.tagName);
      if (isBlock) { flush(); walk(child); } else { for (const nested of child.childNodes) visit(nested); }
    }
    for (const child of element.childNodes) visit(child);
    // Plain HTML container text is retained too; no body.innerText shortcut.
    if (semantic || normalizeText(text)) flush();
  }
  walk(root); return { blocks, excluded: [...excluded] };
}

export async function extractDocuments(doc: Document, url = doc.location.href, maxCharacters = 2400): Promise<ExtractionResult> {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 100) throw new Error('Invalid semantic chunk limit');
  const candidates = identifyDocuments(doc, url); const documents = [];
  const ambiguous = candidates.length > 1;
  for (const candidate of candidates) {
    const { blocks, excluded } = collectBlocks(candidate.root);
    for (const node of doc.querySelectorAll(excludedSelector)) if (!candidate.root.contains(node)) excluded.push(selectorFor(node));
    for (const node of doc.querySelectorAll('footer')) if (!candidate.root.contains(node)) excluded.push(selectorFor(node));
    for (const node of doc.querySelectorAll('aside')) if (!candidate.root.contains(node)) excluded.push(selectorFor(node));
    const contentHash = await hashText(JSON.stringify(blocks.map(block => [selectorFor(block.element), block.text, block.headingPath])));
    const documentId = await hashText(JSON.stringify([url, candidate.type, contentHash]));
    const chunks: SourceChunk[] = []; const warnings: string[] = [];
    for (const block of blocks) {
      for (const piece of splitText(block.text, maxCharacters)) {
        if (!normalizeText(piece.text)) continue;
        const order = chunks.length; const textHash = await hashText(piece.text);
        const segments = block.nodes.filter(node => node.end > piece.start && node.start < piece.end).map(node => ({
          path: nodePath(block.element, node.node), start: Math.max(0, piece.start - node.start), end: Math.min(node.end - node.start, piece.end - node.start),
        }));
        chunks.push({ chunkId: await hashText(JSON.stringify([documentId, order, textHash])), text: piece.text, analysisText: normalizeText(piece.text),
          ...(block.heading ? { heading: block.heading } : {}), sourceLocator: { selector: selectorFor(block.element), headingPath: block.headingPath, textStart: piece.start, textEnd: piece.end, segments }, textHash, order });
        if (piece.text.length > maxCharacters) warnings.push('An indivisible source segment exceeds the configured chunk limit; it was retained in full.');
      }
    }
    const sections = [...candidate.root.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const detectedSections = sections.map(node => normalizeText(node.textContent ?? ''));
    const extractedSections = sections.filter(isVisible).map(node => normalizeText(node.textContent ?? ''));
    const unopenedSections = [...new Set([
      ...sections.filter(node => !isVisible(node)).map(node => normalizeText(node.textContent ?? '')),
      ...[...candidate.root.querySelectorAll('section,article,p,li,dd,blockquote')].filter(node => !isVisible(node) && !node.closest(excludedSelector) && normalizeText(node.textContent ?? '')).map(node => `${node.id || selectorFor(node)} (hidden legal region)`),
    ])];
    const expectation = fixtureExpectation(url);
    const knownMissingSections: string[] = [];
    if (expectation) {
      for (const [id, expected] of Object.entries(expectation.blocks)) {
        const node = doc.getElementById(id);
        if (!node || !candidate.root.contains(node) || !isVisible(node) || node.textContent !== expected || !blocks.some(block => block.element === node && block.text === expected)) knownMissingSections.push(id);
      }
    }
    const uncertainty = expectation ? [] : ['No independently verified document boundary or section inventory exists for this page.', 'Content behind navigation, frames, shadow roots or delayed updates may be missing.'];
    const unknownControls = [...candidate.root.querySelectorAll('[aria-expanded="false"],details:not([open])')];
    if (unknownControls.length) warnings.push(`${unknownControls.length} unopened expandable controls detected.`);
    if (ambiguous) warnings.push('Multiple plausible legal documents detected; they were kept separate and no document was automatically selected.');
    const status = !chunks.length ? 'FAILED' : knownMissingSections.length || unopenedSections.length || unknownControls.length || ambiguous ? 'PARTIAL' : expectation && candidate.root.id === expectation.rootId ? 'COMPLETE' : 'UNKNOWN';
    if (status === 'UNKNOWN') warnings.push('Accessible legal text extracted; completeness is unverified.');
    if (knownMissingSections.length) warnings.push(`Known missing or changed expected blocks: ${knownMissingSections.join(', ')}`);
    documents.push(contractDocumentSchema.parse({ documentId, url, title: candidate.title, documentType: candidate.type, sourceChunks: chunks, contentHash,
      extraction: { status, extractedChunkCount: chunks.length, extractedCharacterCount: chunks.reduce((sum, chunk) => sum + chunk.text.length, 0), warnings,
        excludedRegions: excluded, coverage: { detectedSections, extractedSections, unopenedSections, knownMissingSections, uncertainty, ...(expectation ? { expectedRegion: expectation.rootId } : {}) } }, createdAt: new Date().toISOString() }));
  }
  const links = [...doc.querySelectorAll('a[href]')].filter(node => identifyType(node.textContent ?? '') !== 'unknown').map(node => normalizeText(node.textContent ?? ''));
  return { documents, ambiguous, warnings: !documents.length ? ['No identifiable legal document found. Policy links and keyword density alone do not prove a document is present.', ...(links.length ? [`Legal link labels detected, but not automatically followed: ${links.join('; ')}`] : [])] : documents.flatMap(document => document.extraction.warnings) };
}
