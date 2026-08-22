import { Injectable } from '@nestjs/common';
import {
  DeliveryRequestedMessageV2,
  DeliveryRetryScheduledMessage,
  NormalizedDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { NextRetry } from './retry-policy.service';

@Injectable()
export class RetryPublisherService {
  constructor(private readonly producer: KafkaProducerService) {}

  async schedule(
    current: NormalizedDeliveryRequestedMessage,
    projectId: string,
    retry: NextRetry,
    notBefore: Date,
  ): Promise<void> {
    const delivery: DeliveryRequestedMessageV2 = {
      ...current,
      version: 2,
      jobId: `${current.deliveryId}:${retry.nextAttemptNumber}`,
      projectId,
      attemptNumber: retry.nextAttemptNumber,
      scheduledAt: notBefore.toISOString(),
    };
    const message: DeliveryRetryScheduledMessage = {
      version: 1,
      stage: retry.stage,
      notBefore: notBefore.toISOString(),
      delivery,
    };
    await this.producer.publish(retry.topic, projectId, message);
  }
}
