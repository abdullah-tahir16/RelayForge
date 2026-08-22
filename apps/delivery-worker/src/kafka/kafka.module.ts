import { Module } from '@nestjs/common';
import { KafkaClientService } from './kafka-client.service';
import { KafkaTopicsService } from './kafka-topics.service';
import { KafkaProducerService } from './kafka-producer.service';

@Module({
  providers: [KafkaClientService, KafkaTopicsService, KafkaProducerService],
  exports: [KafkaClientService, KafkaTopicsService, KafkaProducerService],
})
export class KafkaModule {}
