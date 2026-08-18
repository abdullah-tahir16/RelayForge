import { Module } from '@nestjs/common';
import { PgPoolService } from './pg-pool.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { WebhookSenderService } from './webhook-sender.service';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  providers: [
    PgPoolService,
    DeliveriesSqlRepository,
    WebhookSenderService,
    DeliveryConsumerService,
  ],
})
export class DeliveryModule {}
