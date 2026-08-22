import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer } from 'kafkajs';
import {
  DELIVERIES_TOPIC,
  DELIVERY_CONSUMER_GROUP,
  DeliveryRequestedMessage,
  NormalizedDeliveryRequestedMessage,
  normalizeDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { KafkaClientService } from '../kafka/kafka-client.service';
import { KafkaTopicsService } from '../kafka/kafka-topics.service';
import { WebhookSenderService } from './webhook-sender.service';
import { buildWebhookRequest } from './webhook-request.builder';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { redactHeaders } from './header-redaction';
import { RetryPolicyService } from './retry-policy.service';
import { RetryPublisherService } from './retry-publisher.service';

@Injectable()
export class DeliveryConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeliveryConsumerService.name);
  private readonly processingLeaseMs: number;
  private readonly sensitiveHeaders: string[];
  private readonly deliveriesTopic: string;
  private readonly deliveryConsumerGroup: string;
  private consumer: Consumer;

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly kafkaTopics: KafkaTopicsService,
    private readonly webhookSender: WebhookSenderService,
    private readonly deliveriesSqlRepository: DeliveriesSqlRepository,
    private readonly retryPolicy: RetryPolicyService,
    private readonly retryPublisher: RetryPublisherService,
    configService: ConfigService,
  ) {
    this.processingLeaseMs = configService.get<number>('delivery.processingLeaseMs', 45_000);
    this.sensitiveHeaders = configService.get<string[]>(
      'delivery.sensitiveHeaders',
      ['authorization', 'cookie', 'set-cookie', 'x-relayforge-signature'],
    );
    this.deliveriesTopic = configService.get<string>(
      'kafka.deliveriesTopic',
      DELIVERIES_TOPIC,
    );
    this.deliveryConsumerGroup = configService.get<string>(
      'kafka.deliveryConsumerGroup',
      DELIVERY_CONSUMER_GROUP,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.kafkaTopics.ensureTopics();
    this.consumer = this.kafkaClient.kafka.consumer({
      groupId: this.deliveryConsumerGroup,
    });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.deliveriesTopic,
      fromBeginning: false,
    });
    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString()) as DeliveryRequestedMessage;
        try {
          await this.processDelivery(payload);
        } catch (error) {
          this.logger.error(`Failed to process delivery ${payload.deliveryId}: ${error}`);
          throw error;
        }
        await this.consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      },
    });
  }

  async processDelivery(payload: DeliveryRequestedMessage): Promise<void> {
    const normalized = normalizeDeliveryRequestedMessage(payload);
    const request = buildWebhookRequest(normalized);
    const safeRequestHeaders = redactHeaders(request.headers, this.sensitiveHeaders);
    const claim = await this.deliveriesSqlRepository.claimAttempt(
      normalized.deliveryId,
      normalized.attemptNumber,
      safeRequestHeaders,
      this.processingLeaseMs,
    );

    if (claim.status === 'retry_required') {
      await this.republishRequiredRetry(
        normalized,
        claim.projectId,
        claim.nextAttemptAt,
        claim.completedAttempts,
      );
      return;
    }
    if (
      claim.status === 'terminal' ||
      claim.status === 'completed_duplicate' ||
      claim.status === 'missing'
    ) {
      return;
    }
    if (claim.status !== 'claimed' || !claim.processingToken || !claim.projectId) {
      throw new Error(`Delivery attempt cannot be claimed: ${claim.status}`);
    }

    const startedAt = Date.now();
    const result = await this.webhookSender.send(request);
    const durationMs = Date.now() - startedAt;
    const nextRetry = result.succeeded
      ? null
      : this.retryPolicy.nextAfter(normalized.attemptNumber);
    const completion = await this.deliveriesSqlRepository.completeAttempt(
      normalized.deliveryId,
      normalized.attemptNumber,
      claim.processingToken,
      {
        requestHeaders: safeRequestHeaders,
        responseStatus: result.statusCode,
        responseHeaders: result.responseHeaders
          ? redactHeaders(result.responseHeaders, this.sensitiveHeaders)
          : null,
        responseBodyPreview: result.responseBodyPreview,
        durationMs,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      },
      nextRetry?.delayMs ?? null,
    );

    if (completion.state === 'RETRYING' && nextRetry && completion.nextAttemptAt) {
      await this.retryPublisher.schedule(
        normalized,
        claim.projectId,
        nextRetry,
        completion.nextAttemptAt,
      );
      return;
    }
    await this.deliveriesSqlRepository.aggregateEventStatus(normalized.eventId);
  }

  private async republishRequiredRetry(
    normalized: NormalizedDeliveryRequestedMessage,
    projectId?: string,
    nextAttemptAt?: Date,
    completedAttempts?: number,
  ): Promise<void> {
    const retry = this.retryPolicy.nextAfter(
      completedAttempts ?? normalized.attemptNumber,
    );
    if (!retry || !projectId || !nextAttemptAt) {
      throw new Error('Persisted retry is missing scheduling metadata');
    }
    await this.retryPublisher.schedule(normalized, projectId, retry, nextAttemptAt);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }
}
