import { describe, expect, it, vi } from 'vitest';
import { copyToClipboard, formatPayloadPretty, formatPayloadRaw } from './fns';

describe('formatPayloadPretty', () => {
  it('renders valid, indented JSON', () => {
    const result = formatPayloadPretty({ orderId: 'ORD-123', amount: 1 });
    expect(result).toBe('{\n  "orderId": "ORD-123",\n  "amount": 1\n}');
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

describe('formatPayloadRaw', () => {
  it('renders unformatted, single-line JSON', () => {
    const result = formatPayloadRaw({ orderId: 'ORD-123' });
    expect(result).toBe('{"orderId":"ORD-123"}');
    expect(result).not.toContain('\n');
  });
});

describe('copyToClipboard', () => {
  it('invokes the clipboard API with the given text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await copyToClipboard('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });
});
