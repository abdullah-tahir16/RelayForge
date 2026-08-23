import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryDeadLetteredMessageV1,
  DLQ_TOPIC,
} from '@relayforge/kafka-contracts';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';

@Injectable()
export class DeadLetterPublisherService {
  private readonly topic: string;

  constructor(
    private readonly producer: KafkaProducerService,
    private readonly deliveries: DeliveriesSqlRepository,
    configService: ConfigService,
  ) {
    this.topic = configService.get<string>('kafka.dlqTopic', DLQ_TOPIC);
  }

  async publish(message: DeliveryDeadLetteredMessageV1): Promise<void> {
    await this.producer.publish(this.topic, message.projectId, message);
    await this.deliveries.markDeadLetterPublished(message.runId);
  }
}
