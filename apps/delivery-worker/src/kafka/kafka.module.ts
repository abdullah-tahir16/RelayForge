import { Module } from '@nestjs/common';
import { KafkaClientService } from './kafka-client.service';
import { KafkaTopicsService } from './kafka-topics.service';

@Module({
  providers: [KafkaClientService, KafkaTopicsService],
  exports: [KafkaClientService, KafkaTopicsService],
})
export class KafkaModule {}
