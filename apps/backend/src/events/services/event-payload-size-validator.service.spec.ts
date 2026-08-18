import { ConfigService } from '@nestjs/config';
import { EventPayloadSizeValidatorService } from './event-payload-size-validator.service';

describe('EventPayloadSizeValidatorService', () => {
  const makeValidator = (maxPayloadBytes: number) =>
    new EventPayloadSizeValidatorService({
      get: () => maxPayloadBytes,
    } as unknown as ConfigService);

  it('accepts a payload within the limit', () => {
    const validator = makeValidator(1024);
    expect(validator.isWithinLimit({ orderId: 'ORD-123' })).toBe(true);
  });

  it('rejects a payload larger than the limit', () => {
    const validator = makeValidator(10);
    expect(validator.isWithinLimit({ orderId: 'ORD-123', amount: 125.5 })).toBe(
      false,
    );
  });
});
