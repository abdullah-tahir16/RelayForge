import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DELIVERIES_TOPIC, RETRY_TOPICS } from '@relayforge/kafka-contracts';
import { KafkaClientService } from './kafka-client.service';

@Injectable()
export class KafkaTopicsService {
  private readonly logger = new Logger(KafkaTopicsService.name);
  private ensured: Promise<void> | null = null;
  private readonly topics: string[];

  constructor(
    private readonly kafkaClient: KafkaClientService,
    configService: ConfigService,
  ) {
    this.topics = [
      configService.get<string>('kafka.deliveriesTopic', DELIVERIES_TOPIC),
      ...configService.get<string[]>('kafka.retryTopics', [...RETRY_TOPICS]),
    ];
  }

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
      const existing = new Set(await admin.listTopics());
      const missing = this.topics
        .filter((topic) => !existing.has(topic))
        .map((topic) => ({ topic, numPartitions: 3 }));
      if (missing.length > 0) {
        await admin.createTopics({ topics: missing });
      }
    } catch (error) {
      this.logger.warn(`Topic bootstrap did not fully complete: ${error}`);
    } finally {
      await admin.disconnect();
    }
  }
}
