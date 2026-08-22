import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DELIVERIES_TOPIC,
  DeliveryRetryScheduledMessage,
  RETRY_CONSUMER_GROUP,
  RETRY_TOPICS,
} from '@relayforge/kafka-contracts';
import { Consumer } from 'kafkajs';
import { KafkaClientService } from '../kafka/kafka-client.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KafkaTopicsService } from '../kafka/kafka-topics.service';

@Injectable()
export class RetryConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetryConsumerService.name);
  private readonly resumeTimers = new Map<string, NodeJS.Timeout>();
  private readonly deliveriesTopic: string;
  private readonly retryTopics: string[];
  private readonly retryConsumerGroup: string;
  private consumer: Consumer;

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly kafkaTopics: KafkaTopicsService,
    private readonly producer: KafkaProducerService,
    configService: ConfigService,
  ) {
    this.deliveriesTopic = configService.get<string>(
      'kafka.deliveriesTopic',
      DELIVERIES_TOPIC,
    );
    this.retryTopics = configService.get<string[]>(
      'kafka.retryTopics',
      [...RETRY_TOPICS],
    );
    this.retryConsumerGroup = configService.get<string>(
      'kafka.retryConsumerGroup',
      RETRY_CONSUMER_GROUP,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.kafkaTopics.ensureTopics();
    this.consumer = this.kafkaClient.kafka.consumer({ groupId: this.retryConsumerGroup });
    await this.consumer.connect();
    for (const topic of this.retryTopics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString()) as DeliveryRetryScheduledMessage;
        const waitMs = new Date(payload.notBefore).getTime() - Date.now();
        if (waitMs > 0) {
          this.pauseUntilDue(topic, partition, message.offset, waitMs);
          return;
        }
        await this.producer.publish(
          this.deliveriesTopic,
          payload.delivery.projectId,
          payload.delivery,
        );
        await this.consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      },
    });
  }

  private pauseUntilDue(topic: string, partition: number, offset: string, waitMs: number): void {
    const key = `${topic}:${partition}`;
    if (this.resumeTimers.has(key)) return;
    this.consumer.pause([{ topic, partitions: [partition] }]);
    const timer = setTimeout(() => {
      this.resumeTimers.delete(key);
      try {
        this.consumer.seek({ topic, partition, offset });
        this.consumer.resume([{ topic, partitions: [partition] }]);
      } catch (error) {
        this.logger.warn(`Could not resume retry partition ${key}: ${error}`);
      }
    }, Math.min(waitMs, 2_147_483_647));
    this.resumeTimers.set(key, timer);
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.resumeTimers.values()) clearTimeout(timer);
    this.resumeTimers.clear();
    await this.consumer?.disconnect();
  }
}
