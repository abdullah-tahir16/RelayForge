import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer } from 'kafkajs';
import {
  DELIVERIES_TOPIC,
  DELIVERY_CONSUMER_GROUP,
  DeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { KafkaClientService } from '../kafka/kafka-client.service';
import { KafkaTopicsService } from '../kafka/kafka-topics.service';
import { WebhookSenderService } from './webhook-sender.service';
import { buildWebhookRequest } from './webhook-request.builder';
import { DeliveriesSqlRepository, DeliveryOutcome } from './deliveries-sql.repository';

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED']);

@Injectable()
export class DeliveryConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeliveryConsumerService.name);
  private consumer: Consumer;

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly kafkaTopics: KafkaTopicsService,
    private readonly webhookSender: WebhookSenderService,
    private readonly deliveriesSqlRepository: DeliveriesSqlRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.kafkaTopics.ensureTopics();

    this.consumer = this.kafkaClient.kafka.consumer({
      groupId: DELIVERY_CONSUMER_GROUP,
    });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: DELIVERIES_TOPIC,
      fromBeginning: false,
    });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) {
          return;
        }
        const payload = JSON.parse(
          message.value.toString(),
        ) as DeliveryRequestedMessage;

        try {
          await this.processDelivery(payload);
        } catch (error) {
          this.logger.error(
            `Failed to process delivery ${payload.deliveryId}: ${error}`,
          );
          throw error;
        }

        await this.consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      },
    });
  }

  private async processDelivery(
    payload: DeliveryRequestedMessage,
  ): Promise<void> {
    const currentStatus = await this.deliveriesSqlRepository.getStatus(
      payload.deliveryId,
    );
    if (currentStatus && TERMINAL_STATUSES.has(currentStatus)) {
      // Redelivered message for an already-resolved delivery — do not re-send.
      return;
    }

    const request = buildWebhookRequest(payload);
    const startedAt = Date.now();
    const result = await this.webhookSender.send(request);
    const durationMs = Date.now() - startedAt;
    const outcome: DeliveryOutcome = result.succeeded ? 'SUCCEEDED' : 'FAILED';

    const transitioned = await this.deliveriesSqlRepository.resolveDelivery(
      payload.deliveryId,
      outcome,
      result.statusCode ?? null,
      durationMs,
    );
    if (transitioned) {
      await this.deliveriesSqlRepository.aggregateEventStatus(payload.eventId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }
}
