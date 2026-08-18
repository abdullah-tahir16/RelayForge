import { describe, expect, it } from 'vitest';
import { subscribeFormSchema } from './data';

describe('subscribeFormSchema', () => {
  it.each(['order.completed', 'order.created', 'invoice.paid'])(
    'accepts an exact pattern %s',
    (eventPattern) => {
      expect(subscribeFormSchema.safeParse({ eventPattern }).success).toBe(true);
    },
  );

  it('accepts a single-level wildcard', () => {
    expect(
      subscribeFormSchema.safeParse({ eventPattern: 'order.*' }).success,
    ).toBe(true);
  });

  it('accepts the bare wildcard', () => {
    expect(subscribeFormSchema.safeParse({ eventPattern: '*' }).success).toBe(
      true,
    );
  });

  it.each(['', 'ORDER.CREATED', 'order..created', '*.order', 'order '])(
    'rejects malformed pattern %j',
    (eventPattern) => {
      expect(
        subscribeFormSchema.safeParse({ eventPattern }).success,
      ).toBe(false);
    },
  );
});
