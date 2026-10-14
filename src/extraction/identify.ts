import type { DocumentType } from './schema';
export function identifyType(text: string): DocumentType {
  if (/privacy\s+(?:policy|notice|statement)|gizlilik\s+(?:politikası|bildirimi|beyanı)|kişisel\s+veri|personal\s+data/i.test(text)) return 'privacy_policy';
  if (/subscription\s+(?:terms|agreement)|abonelik\s+(?:koşulları|şartları|sözleşmesi)/i.test(text)) return 'subscription_terms';
  if (/terms\s+(?:of\s+(?:service|use)|and\s+conditions)|(?:end\s+)?user\s+agreement|kullanım\s+(?:hüküm\s+ve\s+)?(?:koşulları|şartları)|hizmet\s+şartları/i.test(text)) return 'terms_of_service';
  return 'unknown';
}
export interface Candidate { root: Element; type: DocumentType; title: string }
export function identifyDocuments(doc: Document, url: string): Candidate[] {
  const describe = (root: Element): Candidate => {
    const headings = [...root.querySelectorAll('h1,h2,h3')].filter(heading => !heading.closest('nav,form,aside'));
    const heading = headings.find(node => identifyType(node.textContent ?? '') !== 'unknown');
    const title = heading?.textContent?.trim() ?? headings[0]?.textContent?.trim() ?? doc.title;
    return { root, title, type: identifyType(title) };
  };
  const articles = [...doc.querySelectorAll('article')].filter(node => !node.closest('nav,aside,form'));
  const legalArticles = articles.map(describe).filter(item => item.type !== 'unknown');
  if (legalArticles.length) return legalArticles.filter(item => !legalArticles.some(other => other !== item && other.root.contains(item.root)));
  const mains = [...doc.querySelectorAll('main,[role="main"]')].filter(node => !node.closest('form'));
  const roots = mains.length ? mains : [doc.body];
  return roots.filter(Boolean).map(describe).map(item => ({ ...item, type: item.type === 'unknown' ? identifyType(`${doc.title} ${decodeURI(new URL(url).pathname).replace(/[-_]/g, ' ')}`) : item.type })).filter(item => item.type !== 'unknown');
}
