import { Module } from '@nestjs/common';
import { PgPoolService } from './pg-pool.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { WebhookSenderService } from './webhook-sender.service';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { KafkaModule } from '../kafka/kafka.module';
import { RetryPolicyService } from './retry-policy.service';
import { RetryPublisherService } from './retry-publisher.service';
import { RetryConsumerService } from './retry-consumer.service';

@Module({
  imports: [KafkaModule],
  providers: [
    PgPoolService,
    DeliveriesSqlRepository,
    WebhookSenderService,
    DeliveryConsumerService,
    RetryPolicyService,
    RetryPublisherService,
    RetryConsumerService,
  ],
})
export class DeliveryModule {}
