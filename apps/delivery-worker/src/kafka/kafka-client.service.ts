import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaClientService {
  readonly kafka: Kafka;

  constructor(configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'relayforge-delivery-worker',
      brokers: configService.get<string[]>('kafka.brokers', [
        'localhost:9094',
      ]),
    });
  }
}
