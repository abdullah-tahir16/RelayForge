import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventEntity } from './entities/event.entity';
import { EventTypeValidatorService } from './services/event-type-validator.service';
import { EventPayloadSizeValidatorService } from './services/event-payload-size-validator.service';
import { IngestEventHandler } from './commands/handlers/ingest-event.handler';
import { KafkaModule } from '../kafka/kafka.module';

const commandHandlers = [IngestEventHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    KafkaModule,
    TypeOrmModule.forFeature([EventEntity]),
  ],
  controllers: [EventsController],
  providers: [
    EventTypeValidatorService,
    EventPayloadSizeValidatorService,
    ...commandHandlers,
  ],
  exports: [],
})
export class EventsModule {}
