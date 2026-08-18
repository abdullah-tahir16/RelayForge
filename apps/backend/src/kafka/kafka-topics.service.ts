import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENTS_TOPIC, DELIVERIES_TOPIC } from '@relayforge/kafka-contracts';
import { KafkaClientService } from './kafka-client.service';

@Injectable()
export class KafkaTopicsService implements OnModuleInit {
  private readonly logger = new Logger(KafkaTopicsService.name);
  private ensured: Promise<void> | null = null;

  constructor(private readonly kafkaClient: KafkaClientService) {}

  onModuleInit(): Promise<void> {
    return this.ensureTopics();
  }

  /**
   * Idempotent and memoized so any consumer can await it before subscribing,
   * instead of racing this service's own onModuleInit hook (NestJS does not
   * guarantee hook ordering across sibling modules that share KafkaModule).
   */
  ensureTopics(): Promise<void> {
    if (!this.ensured) {
      this.ensured = this.createTopics();
    }
    return this.ensured;
  }

  private async createTopics(): Promise<void> {
    const admin = this.kafkaClient.kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [
          { topic: EVENTS_TOPIC, numPartitions: 3 },
          { topic: DELIVERIES_TOPIC, numPartitions: 3 },
        ],
      });
    } catch (error) {
      this.logger.warn(`Topic bootstrap did not fully complete: ${error}`);
    } finally {
      await admin.disconnect();
    }
  }
}
