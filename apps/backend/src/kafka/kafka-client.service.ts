import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaClientService {
  readonly kafka: Kafka;

  constructor(configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'relayforge-backend',
      brokers: configService.get<string[]>('kafka.brokers', [
        'localhost:9094',
      ]),
    });
  }

  /** Live connectivity check for readiness probes — connects a throwaway admin client. */
  async checkConnection(): Promise<boolean> {
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      await admin.listTopics();
      return true;
    } catch {
      return false;
    } finally {
      await admin.disconnect();
    }
  }
}
