import { JSDOM } from 'jsdom';
import { z } from 'zod/v4';
import { extractDocuments } from '../extraction/dom';
export const suppliedDocumentSchema = z.strictObject({
  sourceId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  title: z.enum(['Subscription Terms', 'Privacy Policy', 'Terms of Service']).default('Subscription Terms'),
  documentText: z.string().min(40).max(1600),
});
export async function suppliedDocument(input: z.infer<typeof suppliedDocumentSchema>) {
  const dom = new JSDOM('<main><h1></h1><p></p></main>', { url: `https://supplied.invalid/${input.sourceId}` });
  try {
    dom.window.document.querySelector('h1')!.textContent = input.title;
    dom.window.document.querySelector('p')!.textContent = input.documentText;
    return (await extractDocuments(dom.window.document)).documents[0]!;
  } finally { dom.window.close(); }
}
