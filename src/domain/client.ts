import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().url(),
  createdAt: z.coerce.date(),
});

export type Client = z.infer<typeof ClientSchema>;
