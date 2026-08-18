import { z } from 'zod';

const EVENT_PATTERN_REGEX = /^\*$|^[a-z0-9]+(\.[a-z0-9]+)*(\.\*)?$/;

export const subscribeFormSchema = z.object({
  eventPattern: z
    .string()
    .min(1, 'Pattern is required')
    .regex(
      EVENT_PATTERN_REGEX,
      'Use "*", or lowercase dot-separated segments optionally ending in ".*"',
    ),
});

export type SubscribeFormValues = z.infer<typeof subscribeFormSchema>;
