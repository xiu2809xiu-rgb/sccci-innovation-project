import { z } from 'zod';

/** A person named in a response (who approved, who resolved): id and display name only. */
export const userRefSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
});

export type UserRef = z.infer<typeof userRefSchema>;
