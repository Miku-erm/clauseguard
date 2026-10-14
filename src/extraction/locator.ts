import type { SourceLocator } from './schema';
export function selectorFor(element: Element): string {
  // Structural selectors distinguish duplicate IDs and paragraphs; hashes detect stale versions.
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node.tagName !== 'HTML') {
    const siblings: Element[] = [...(node.parentElement?.children ?? [])].filter(child => child.tagName === node!.tagName);
    parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`); node = node.parentElement;
  }
  return `html > ${parts.join(' > ')}`;
}
export function nodePath(root: Node, node: Node): number[] {
  const path: number[] = [];
  while (node !== root) {
    if (!node.parentNode) throw new Error('Detached source node');
    path.unshift([...node.parentNode.childNodes].indexOf(node as ChildNode)); node = node.parentNode;
  }
  return path;
}
export function readLocatedText(doc: Document, locator: SourceLocator): string | null {
  const root = doc.querySelector(locator.selector);
  if (!root) return null;
  const texts: string[] = [];
  for (const segment of locator.segments) {
    let node: Node | undefined = root;
    for (const index of segment.path) node = node?.childNodes[index];
    if (!node || node.nodeType !== 3 || segment.end > (node.textContent?.length ?? 0)) return null;
    texts.push(node.textContent!.slice(segment.start, segment.end));
  }
  return texts.join('');
}
