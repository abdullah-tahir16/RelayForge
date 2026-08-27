import { Injectable } from '@nestjs/common';
import {
  deliveryJobId,
  DeliveryRequestedMessageV3,
  DeliveryRequestedMessageV4,
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
    run: { id: string; number: number },
  ): Promise<void> {
    const common = {
      jobId: deliveryJobId(run.id, retry.nextRunAttemptNumber),
      projectId,
      runId: run.id,
      runNumber: run.number,
      attemptNumber: current.attemptNumber + 1,
      runAttemptNumber: retry.nextRunAttemptNumber,
      scheduledAt: notBefore.toISOString(),
      deliveryId: current.deliveryId,
      eventId: current.eventId,
      endpointId: current.endpointId,
      eventType: current.eventType,
      eventCreatedAt: current.eventCreatedAt,
      data: current.data,
      endpointUrl: current.endpointUrl,
      endpointTimeoutMs: current.endpointTimeoutMs,
    };
    const delivery: DeliveryRequestedMessageV3 | DeliveryRequestedMessageV4 =
      current.sourceVersion === 4
        ? {
            ...common,
            version: 4,
            endpointSigningSecretEncrypted:
              current.endpointSigningSecretEncrypted!,
            endpointSigningSecretVersion:
              current.endpointSigningSecretVersion!,
          }
        : {
            ...common,
            version: 3,
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
