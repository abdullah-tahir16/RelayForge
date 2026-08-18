import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsQueryController } from './events-query.controller';
import { EventEntity } from './entities/event.entity';
import { DeliveryEntity } from '../deliveries/entities/delivery.entity';
import { EventTypeValidatorService } from './services/event-type-validator.service';
import { EventPayloadSizeValidatorService } from './services/event-payload-size-validator.service';
import { IngestEventHandler } from './commands/handlers/ingest-event.handler';
import { GetEventsHandler } from './queries/handlers/get-events.handler';
import { GetEventHandler } from './queries/handlers/get-event.handler';
import { KafkaModule } from '../kafka/kafka.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

const commandHandlers = [IngestEventHandler];
const queryHandlers = [GetEventsHandler, GetEventHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    KafkaModule,
    ProjectsModule,
    WorkspacesModule,
    TypeOrmModule.forFeature([EventEntity, DeliveryEntity]),
  ],
  controllers: [EventsController, EventsQueryController],
  providers: [
    EventTypeValidatorService,
    EventPayloadSizeValidatorService,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [],
})
export class EventsModule {}
