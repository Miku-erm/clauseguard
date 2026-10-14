/** Original DOM text is never normalized. This function is only for analysis. */
export function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[\t\f\v ]+/g, ' ').replace(/ *\n */g, '\n').trim();
}
export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
}
/** Split only at sentence or whitespace boundaries; retain every original character. */
export function splitText(text: string, maxCharacters: number): Array<{ text: string; start: number; end: number }> {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 100) throw new Error('Chunk limit must be an integer >= 100');
  const pieces: Array<{ text: string; start: number; end: number }> = [];
  let start = 0;
  while (text.length - start > maxCharacters) {
    const window = text.slice(start, start + maxCharacters);
    const sentences = [...window.matchAll(/[.!?](?:["”')]*)(?=\s)/g)];
    let length = sentences.at(-1) ? sentences.at(-1)!.index! + sentences.at(-1)![0].length : window.lastIndexOf(' ');
    if (length < maxCharacters / 3) {
      const nextSpace = text.indexOf(' ', start + maxCharacters);
      length = nextSpace < 0 ? text.length - start : nextSpace - start;
    }
    pieces.push({ text: text.slice(start, start + length), start, end: start + length }); start += length;
  }
  if (start < text.length) pieces.push({ text: text.slice(start), start, end: text.length });
  return pieces;
}
