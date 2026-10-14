import { z } from 'zod/v4';
export const scanCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('EXTRACT_DOCUMENT'), sessionId: z.string().uuid(), expectedUrl: z.string().url() }),
  z.strictObject({ type: z.literal('DISCOVER_DOCUMENT'), sessionId: z.string().uuid(), expectedUrl: z.string().url() }),
  z.strictObject({ type: z.literal('CANCEL_DOCUMENT'), sessionId: z.string().uuid() }),
]);
