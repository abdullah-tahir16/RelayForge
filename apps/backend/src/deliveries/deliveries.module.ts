import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryEntity } from './entities/delivery.entity';
import { EventEntity } from '../events/entities/event.entity';
import { EventPatternMatcherService } from './services/event-pattern-matcher.service';
import { RoutingConsumerService } from './services/routing-consumer.service';
import { RouteEventHandler } from './commands/handlers/route-event.handler';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { KafkaModule } from '../kafka/kafka.module';

const commandHandlers = [RouteEventHandler];

@Module({
  imports: [
    CqrsModule,
    KafkaModule,
    EndpointsModule,
    SubscriptionsModule,
    TypeOrmModule.forFeature([DeliveryEntity, EventEntity]),
  ],
  providers: [
    EventPatternMatcherService,
    RoutingConsumerService,
    ...commandHandlers,
  ],
})
export class DeliveriesModule {}
