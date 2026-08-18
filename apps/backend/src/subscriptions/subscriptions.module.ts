import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionEntity } from './entities/subscription.entity';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { EventPatternValidatorService } from './services/event-pattern-validator.service';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { SubscribeEndpointHandler } from './commands/handlers/subscribe-endpoint.handler';
import { UnsubscribeHandler } from './commands/handlers/unsubscribe.handler';
import { GetSubscriptionsHandler } from './queries/handlers/get-subscriptions.handler';

const commandHandlers = [SubscribeEndpointHandler, UnsubscribeHandler];
const queryHandlers = [GetSubscriptionsHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    EndpointsModule,
    TypeOrmModule.forFeature([SubscriptionEntity]),
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsRepository,
    EventPatternValidatorService,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [SubscriptionsRepository],
})
export class SubscriptionsModule {}
