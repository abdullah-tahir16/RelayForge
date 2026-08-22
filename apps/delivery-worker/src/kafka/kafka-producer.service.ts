import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { KafkaClientService } from './kafka-client.service';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(private readonly kafkaClient: KafkaClientService) {}

  async onModuleInit(): Promise<void> {
    this.producer = this.kafkaClient.kafka.producer();
    await this.producer.connect();
  }

  async publish(topic: string, key: string, value: unknown): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
  }
}
