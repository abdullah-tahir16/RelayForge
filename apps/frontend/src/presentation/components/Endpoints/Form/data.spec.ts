import { describe, expect, it } from 'vitest';
import { endpointFormSchema } from './data';

describe('endpointFormSchema', () => {
  it('accepts a valid endpoint', () => {
    const result = endpointFormSchema.safeParse({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
      timeoutMs: 10000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = endpointFormSchema.safeParse({
      name: '',
      url: 'https://example.com/webhook',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed URL', () => {
    const result = endpointFormSchema.safeParse({
      name: 'Fulfilment',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a timeout above the backend maximum', () => {
    const result = endpointFormSchema.safeParse({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
      timeoutMs: 60000,
    });
    expect(result.success).toBe(false);
  });

  it('allows an omitted timeout', () => {
    const result = endpointFormSchema.safeParse({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
    });
    expect(result.success).toBe(true);
  });
});
