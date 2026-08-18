import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesQueryController } from './deliveries-query.controller';
import { DeliveryEntity } from './entities/delivery.entity';
import { EventEntity } from '../events/entities/event.entity';
import { EventPatternMatcherService } from './services/event-pattern-matcher.service';
import { RoutingConsumerService } from './services/routing-consumer.service';
import { RouteEventHandler } from './commands/handlers/route-event.handler';
import { GetDeliveriesHandler } from './queries/handlers/get-deliveries.handler';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { KafkaModule } from '../kafka/kafka.module';

const commandHandlers = [RouteEventHandler];
const queryHandlers = [GetDeliveriesHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    KafkaModule,
    EndpointsModule,
    SubscriptionsModule,
    ProjectsModule,
    WorkspacesModule,
    TypeOrmModule.forFeature([DeliveryEntity, EventEntity]),
  ],
  controllers: [DeliveriesQueryController],
  providers: [
    EventPatternMatcherService,
    RoutingConsumerService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class DeliveriesModule {}
