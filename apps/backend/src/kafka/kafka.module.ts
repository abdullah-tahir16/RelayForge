import { Module } from '@nestjs/common';
import { KafkaClientService } from './kafka-client.service';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaTopicsService } from './kafka-topics.service';

@Module({
  providers: [KafkaClientService, KafkaProducerService, KafkaTopicsService],
  exports: [KafkaClientService, KafkaProducerService, KafkaTopicsService],
})
export class KafkaModule {}
