import { z } from 'zod/v4';
import type { Sender } from './protocol';
import { isDemoHost } from './demo-target';
export const uiCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('GET_UI_STATE') }),
  z.strictObject({ type: z.literal('GET_REPORT'), jobId: z.string().uuid() }),
  z.strictObject({ type: z.literal('NAVIGATE_SOURCE'), jobId: z.string().uuid(), findingId: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.strictObject({ type: z.literal('STATUS') }), z.strictObject({ type: z.literal('CLEAR_DATA') }),
  z.strictObject({ type: z.literal('OPEN_POLICY_LINK'), sessionId: z.string().uuid(), url: z.string().url().max(2048) }),
]);
export function uiPage(sender: Sender, runtimeId: string, extensionRoot: string): 'popup' | 'report' | 'settings' | 'demo' | null {
  if (sender.id !== runtimeId || !sender.url) return null;
  try {
    const url = new URL(sender.url); const root = new URL(extensionRoot);
    if (url.protocol !== root.protocol || url.host !== root.host) return null;
    if (url.pathname === '/popup.html' && !url.search && !url.hash) return 'popup';
    if (url.pathname === '/demo.html' && !url.search && !url.hash && isDemoHost(sender.tab?.url)) return 'demo';
    if (url.pathname === '/settings.html' && !url.search && !url.hash) return 'settings';
    if (url.pathname === '/report.html' && !url.hash && [...url.searchParams.keys()].length === 1 && z.string().uuid().safeParse(url.searchParams.get('id')).success) return 'report';
  } catch { /* Untrusted sender URL */ }
  return null;
}
export function authorizeUiCommand(page: ReturnType<typeof uiPage>, type: z.infer<typeof uiCommandSchema>['type']): boolean {
  return page === 'popup' || page === 'demo' && ['GET_UI_STATE', 'GET_REPORT', 'NAVIGATE_SOURCE', 'STATUS'].includes(type) || page === 'report' && ['GET_REPORT', 'NAVIGATE_SOURCE'].includes(type) || page === 'settings' && ['STATUS', 'CLEAR_DATA'].includes(type);
}
