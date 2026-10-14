import { z } from 'zod/v4';
import { sourceLocatorSchema } from '../extraction/schema';
import { extractDocuments, isVisible } from '../extraction/dom';
const highlights = new WeakMap<Document, () => void>();
export const navigateSourceSchema = z.strictObject({ type: z.literal('HIGHLIGHT_SOURCE'), expectedUrl: z.string().url(),
  documentId: z.string(), documentHash: z.string().regex(/^[a-f0-9]{64}$/), sourceChunkId: z.string(), quote: z.string().min(8).max(1400),
  start: z.number().int().nonnegative(), end: z.number().int().positive(), locator: sourceLocatorSchema,
});
/** Resolve original text-node segments without modifying source text or its structure. */
export function sourceRange(doc: Document, input: z.infer<typeof navigateSourceSchema>): { range: Range; element: Element } {
  const matches = doc.querySelectorAll(input.locator.selector);
  if (matches.length !== 1 || !isVisible(matches[0]!)) throw new Error('SOURCE_NOT_UNIQUE');
  const element = matches[0]!;
  const pieces = input.locator.segments.map(segment => {
    let node: Node | undefined = element;
    for (const index of segment.path) node = node?.childNodes[index];
    if (!node || node.nodeType !== 3 || segment.end > (node.textContent?.length ?? 0) || segment.end < segment.start) throw new Error('SOURCE_LOCATOR_CHANGED');
    return { node, start: segment.start, end: segment.end, text: node.textContent!.slice(segment.start, segment.end) };
  });
  const text = pieces.map(piece => piece.text).join('');
  if (input.end <= input.start || text.slice(input.start, input.end) !== input.quote) throw new Error('SOURCE_QUOTE_CHANGED');
  const range = doc.createRange(); let cursor = 0; let began = false; let ended = false;
  for (const piece of pieces) {
    const next = cursor + piece.text.length;
    if (!began && input.start < next) { range.setStart(piece.node, piece.start + input.start - cursor); began = true; }
    if (began && input.end <= next) { range.setEnd(piece.node, piece.start + input.end - cursor); ended = true; break; }
    cursor = next;
  }
  if (!began || !ended || range.toString() !== input.quote) throw new Error('SOURCE_LOCATOR_CHANGED');
  return { range, element };
}
export async function highlightSource(doc: Document, input: z.infer<typeof navigateSourceSchema>): Promise<{ highlighted: true }> {
  if (doc.location.href !== input.expectedUrl) throw new Error('SOURCE_VERSION_CHANGED');
  const extracted = await extractDocuments(doc);
  const document = extracted.documents.find(item => item.documentId === input.documentId && item.contentHash === input.documentHash);
  const chunk = document?.sourceChunks.find(item => item.chunkId === input.sourceChunkId);
  if (!chunk || JSON.stringify(chunk.sourceLocator) !== JSON.stringify(input.locator) || chunk.text.slice(input.start, input.end) !== input.quote) throw new Error('SOURCE_VERSION_CHANGED');
  const { range, element } = sourceRange(doc, input);
  // Chrome CSS Custom Highlight paints the range without inserting/wrapping contract nodes.
  const platform = doc.defaultView as Window & { Highlight?: new (...ranges: Range[]) => unknown; CSS: { highlights?: Map<string, unknown> } };
  if (!platform.Highlight || !platform.CSS?.highlights) throw new Error('SOURCE_HIGHLIGHT_UNSUPPORTED');
  highlights.get(doc)?.();
  platform.CSS.highlights.set('clauseguard-source', new platform.Highlight(range));
  const style = doc.createElement('style'); style.textContent = '::highlight(clauseguard-source){background:#fde68a;color:#172033;}';
  doc.head.append(style); element.setAttribute('data-clauseguard-highlighted', 'true');
  if (platform.getComputedStyle(element, '::highlight(clauseguard-source)').backgroundColor !== 'rgb(253, 230, 138)') {
    platform.CSS.highlights.delete('clauseguard-source'); style.remove(); element.removeAttribute('data-clauseguard-highlighted');
    throw new Error('SOURCE_HIGHLIGHT_UNSUPPORTED');
  }
  element.scrollIntoView({ behavior: 'instant', block: 'center' });
  const cleanup = () => { clearTimeout(timer); platform.CSS.highlights?.delete('clauseguard-source'); style.remove(); element.removeAttribute('data-clauseguard-highlighted'); highlights.delete(doc); };
  const timer = setTimeout(cleanup, 8000); highlights.set(doc, cleanup);
  return { highlighted: true };
}
