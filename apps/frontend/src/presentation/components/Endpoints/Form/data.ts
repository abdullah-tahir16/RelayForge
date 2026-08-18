import { z } from 'zod';

export const endpointFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().min(1, 'URL is required').url('Enter a valid URL'),
  description: z.string().optional(),
  timeoutMs: z
    .number()
    .int()
    .min(1)
    .max(30000, 'Timeout must be at most 30000ms')
    .optional(),
});

export type EndpointFormSchemaValues = z.infer<typeof endpointFormSchema>;
