import { EventPatternValidatorService } from './event-pattern-validator.service';

describe('EventPatternValidatorService', () => {
  const validator = new EventPatternValidatorService();

  it.each(['order.completed', 'order.created', 'customer.created', 'invoice.paid'])(
    'accepts an exact event type %s',
    (pattern) => {
      expect(validator.isValid(pattern)).toBe(true);
    },
  );

  it('accepts a single-level wildcard', () => {
    expect(validator.isValid('order.*')).toBe(true);
  });

  it('accepts the bare wildcard', () => {
    expect(validator.isValid('*')).toBe(true);
  });

  it.each([
    '',
    'ORDER.CREATED',
    'order..created',
    'order.*.detail',
    '*.order',
    '.order',
    'order.',
    'order created',
  ])('rejects malformed pattern %j', (pattern) => {
    expect(validator.isValid(pattern)).toBe(false);
  });
});
