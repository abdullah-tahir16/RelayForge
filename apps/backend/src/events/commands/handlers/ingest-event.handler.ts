import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENTS_TOPIC, EventPublishedMessage } from '@relayforge/kafka-contracts';
import { IngestEventCommand } from '../impl/ingest-event.command';
import { EventEntity, EventStatus } from '../../entities/event.entity';
import { EventTypeValidatorService } from '../../services/event-type-validator.service';
import { EventPayloadSizeValidatorService } from '../../services/event-payload-size-validator.service';
import { EventResponse, toEventResponse } from '../../dto/event-response.dto';
import { KafkaProducerService } from '../../../kafka/kafka-producer.service';

@CommandHandler(IngestEventCommand)
export class IngestEventHandler
  implements ICommandHandler<IngestEventCommand, EventResponse>
{
  constructor(
    private readonly eventTypeValidator: EventTypeValidatorService,
    private readonly payloadSizeValidator: EventPayloadSizeValidatorService,
    private readonly kafkaProducer: KafkaProducerService,
    @InjectRepository(EventEntity)
    private readonly repository: Repository<EventEntity>,
  ) {}

  async execute(command: IngestEventCommand): Promise<EventResponse> {
    if (!this.eventTypeValidator.isValid(command.eventType)) {
      throw new BadRequestException('Invalid event type');
    }
    if (!this.payloadSizeValidator.isWithinLimit(command.data)) {
      throw new PayloadTooLargeException(
        'Event payload exceeds the configured maximum size',
      );
    }

    const event = await this.repository.save(
      this.repository.create({
        projectId: command.projectId,
        eventType: command.eventType,
        payload: command.data,
        metadata: command.metadata,
        status: EventStatus.ACCEPTED,
        publishedAt: null,
      }),
    );

    const message: EventPublishedMessage = {
      version: 1,
      eventId: event.id,
      projectId: event.projectId,
      eventType: event.eventType,
      createdAt: event.createdAt.toISOString(),
    };
    await this.kafkaProducer.publish(EVENTS_TOPIC, event.projectId, message);

    event.status = EventStatus.PUBLISHED;
    event.publishedAt = new Date();
    const published = await this.repository.save(event);

    return toEventResponse(published);
  }
}
