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
import { DeadLetterPublisherService } from './dead-letter-publisher.service';

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
    private readonly deadLetterPublisher: DeadLetterPublisherService,
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
      normalized,
      safeRequestHeaders,
      this.processingLeaseMs,
      this.retryPolicy.maxAttempts,
    );

    if (claim.status === 'retry_publication_required') {
      await this.republishRequiredRetry(
        normalized,
        claim.projectId,
        claim.nextAttemptAt,
        claim.completedRunAttempts,
        claim.runId,
        claim.runNumber,
      );
      return;
    }
    if (claim.status === 'dead_letter_publication_required') {
      if (!claim.deadLetter) {
        throw new Error('Persisted dead letter is missing its safe envelope');
      }
      await this.deadLetterPublisher.publish(claim.deadLetter);
      return;
    }
    if (
      claim.status === 'terminal_legacy' ||
      claim.status === 'completed_duplicate' ||
      claim.status === 'stale_run' ||
      claim.status === 'missing'
    ) {
      return;
    }
    if (
      claim.status !== 'claimed' ||
      !claim.processingToken ||
      !claim.projectId ||
      !claim.runId ||
      !claim.runNumber ||
      !claim.runAttemptNumber
    ) {
      throw new Error(`Delivery attempt cannot be claimed: ${claim.status}`);
    }

    const startedAt = Date.now();
    const result = await this.webhookSender.send(request);
    const durationMs = Date.now() - startedAt;
    const nextRetry = result.succeeded
      ? null
      : this.retryPolicy.nextAfter(claim.runAttemptNumber);
    const completion = await this.deliveriesSqlRepository.completeAttempt(
      normalized.deliveryId,
      claim.runId,
      normalized.attemptNumber,
      claim.runAttemptNumber,
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
        { id: claim.runId, number: claim.runNumber },
      );
      return;
    }
    if (completion.state === 'DEAD_LETTERED') {
      if (!completion.deadLetter) {
        throw new Error('Exhausted delivery did not produce a dead-letter envelope');
      }
      await this.deadLetterPublisher.publish(completion.deadLetter);
    }
  }

  private async republishRequiredRetry(
    normalized: NormalizedDeliveryRequestedMessage,
    projectId?: string,
    nextAttemptAt?: Date,
    completedRunAttempts?: number,
    runId?: string,
    runNumber?: number,
  ): Promise<void> {
    const retry = this.retryPolicy.nextAfter(
      completedRunAttempts ?? normalized.runAttemptNumber ?? normalized.attemptNumber,
    );
    if (
      !retry ||
      !projectId ||
      !nextAttemptAt ||
      !runId ||
      !runNumber
    ) {
      throw new Error('Persisted retry is missing scheduling metadata');
    }
    await this.retryPublisher.schedule(normalized, projectId, retry, nextAttemptAt, {
      id: runId,
      number: runNumber,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }
}
