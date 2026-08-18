import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { KafkaClientService } from './kafka-client.service';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer;

  constructor(kafkaClient: KafkaClientService) {
    this.producer = kafkaClient.kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(topic: string, key: string, message: object): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(message) }],
    });
  }
}
