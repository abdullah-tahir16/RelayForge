import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesQueryController } from './deliveries-query.controller';
import { DeliveryEntity } from './entities/delivery.entity';
import { DeliveryAttemptEntity } from './entities/delivery-attempt.entity';
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
import { GetDeliveryAttemptsHandler } from './queries/handlers/get-delivery-attempts.handler';
import { DeliveryRunEntity } from './entities/delivery-run.entity';
import { GetDlqHandler } from './queries/handlers/get-dlq.handler';
import { GetDeliveryRunsHandler } from './queries/handlers/get-delivery-runs.handler';
import { ReplayCoordinatorService } from './services/replay-coordinator.service';
import { ReplayDeliveryHandler } from './commands/handlers/replay-delivery.handler';
import { ReplayEventHandler } from './commands/handlers/replay-event.handler';

const commandHandlers = [
  RouteEventHandler,
  ReplayDeliveryHandler,
  ReplayEventHandler,
];
const queryHandlers = [
  GetDeliveriesHandler,
  GetDeliveryAttemptsHandler,
  GetDlqHandler,
  GetDeliveryRunsHandler,
];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    KafkaModule,
    EndpointsModule,
    SubscriptionsModule,
    ProjectsModule,
    WorkspacesModule,
    TypeOrmModule.forFeature([
      DeliveryEntity,
      DeliveryRunEntity,
      DeliveryAttemptEntity,
      EventEntity,
    ]),
  ],
  controllers: [DeliveriesQueryController],
  providers: [
    EventPatternMatcherService,
    RoutingConsumerService,
    ReplayCoordinatorService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class DeliveriesModule {}
