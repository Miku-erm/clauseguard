import { isFixtureUrl } from '../core/config';

export const ALLOWED_TOOLS = new Set(['done', 'click_element_by_index', 'scroll']);
export const DISABLED_TOOLS = { input_text: null, select_dropdown_option: null, execute_javascript: null, ask_user: null, wait: null, scroll_horizontally: null };
export interface ClickTarget { tag: string; id: string; type: string; inForm: boolean; connected: boolean; approved: boolean; sameElement: boolean; disabled: boolean }
export function assertClickTarget(url: string, target: ClickTarget): void {
  if (!isFixtureUrl(url) || target.tag !== 'BUTTON' || target.id !== 'open-policy' || target.type !== 'button' ||
      target.inForm || !target.connected || !target.approved || !target.sameElement || target.disabled) {
    throw new Error('Click rejected: only the original approved fixture button is permitted');
  }
}
export function assertClickIndex(input: unknown, state: string): number {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 0) throw new Error('Invalid click index');
  const matches = [...state.matchAll(/\[(\d+)\]<button\b[^>]*\bid=open-policy(?:\s|>)/g)];
  if (matches.length !== 1 || Number(matches[0]![1]) !== input) throw new Error('Click index does not identify the approved button');
  return input;
}
export function restrictTools(tools: Map<string, unknown>): void {
  for (const name of tools.keys()) if (!ALLOWED_TOOLS.has(name)) tools.delete(name);
  for (const name of ALLOWED_TOOLS) if (!tools.has(name)) throw new Error(`Expected upstream tool missing: ${name}`);
}
