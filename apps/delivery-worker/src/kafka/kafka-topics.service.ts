import { Injectable, Logger } from '@nestjs/common';
import { DELIVERIES_TOPIC } from '@relayforge/kafka-contracts';
import { KafkaClientService } from './kafka-client.service';

@Injectable()
export class KafkaTopicsService {
  private readonly logger = new Logger(KafkaTopicsService.name);
  private ensured: Promise<void> | null = null;

  constructor(private readonly kafkaClient: KafkaClientService) {}

  /** Idempotent and memoized — guards against racing the backend's own topic bootstrap on startup. */
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
        topics: [{ topic: DELIVERIES_TOPIC, numPartitions: 3 }],
      });
    } catch (error) {
      this.logger.warn(`Topic bootstrap did not fully complete: ${error}`);
    } finally {
      await admin.disconnect();
    }
  }
}
