import { ConfigService } from '@nestjs/config';
import { RETRY_30S_TOPIC } from '@relayforge/kafka-contracts';
import { RetryPolicyService } from './retry-policy.service';

describe('RetryPolicyService', () => {
  it('selects the next attempt and stage topic', () => {
    const service = new RetryPolicyService(
      new ConfigService({
        delivery: { retryDelaysMs: [1, 2, 3, 4], maxAttempts: 5 },
      }),
    );
    expect(service.nextAfter(1)).toEqual({
      nextAttemptNumber: 2,
      nextRunAttemptNumber: 2,
      delayMs: 1,
      stage: 1,
      topic: RETRY_30S_TOPIC,
    });
    expect(service.nextAfter(5)).toBeNull();
  });

  it('honors a lower configured attempt limit', () => {
    const service = new RetryPolicyService(
      new ConfigService({
        delivery: { retryDelaysMs: [1, 2, 3, 4], maxAttempts: 2 },
      }),
    );
    expect(service.nextAfter(2)).toBeNull();
  });
});
