import { EventTypeValidatorService } from './event-type-validator.service';

describe('EventTypeValidatorService', () => {
  const validator = new EventTypeValidatorService();

  it.each(['order.completed', 'order.created', 'customer.created', 'invoice.paid'])(
    'accepts a well-formed event type %s',
    (eventType) => {
      expect(validator.isValid(eventType)).toBe(true);
    },
  );

  it.each([
    '',
    'ORDER.CREATED',
    'order..created',
    'order.*',
    '*',
    '.order',
    'order.',
    'order created',
  ])('rejects malformed event type %j', (eventType) => {
    expect(validator.isValid(eventType)).toBe(false);
  });
});
