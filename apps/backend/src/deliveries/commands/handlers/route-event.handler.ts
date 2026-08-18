import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DELIVERIES_TOPIC,
  DeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { RouteEventCommand } from '../impl/route-event.command';
import { EventEntity, EventStatus } from '../../../events/entities/event.entity';
import { DeliveryEntity, DeliveryStatus } from '../../entities/delivery.entity';
import { EventPatternMatcherService } from '../../services/event-pattern-matcher.service';
import { EndpointsRepository } from '../../../endpoints/repositories/endpoints.repository';
import { SubscriptionsRepository } from '../../../subscriptions/repositories/subscriptions.repository';
import { EndpointEntity } from '../../../endpoints/entities/endpoint.entity';
import { KafkaProducerService } from '../../../kafka/kafka-producer.service';

@CommandHandler(RouteEventCommand)
export class RouteEventHandler
  implements ICommandHandler<RouteEventCommand, void>
{
  constructor(
    private readonly endpointsRepository: EndpointsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly patternMatcher: EventPatternMatcherService,
    private readonly kafkaProducer: KafkaProducerService,
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveriesRepository: Repository<DeliveryEntity>,
  ) {}

  async execute(command: RouteEventCommand): Promise<void> {
    const event = await this.eventsRepository.findOne({
      where: { id: command.eventId },
    });
    if (!event) {
      return;
    }

    const enabledEndpoints =
      await this.endpointsRepository.findAllEnabledByProjectId(
        event.projectId,
      );

    const matchedEndpoints: EndpointEntity[] = [];
    for (const endpoint of enabledEndpoints) {
      const subscriptions =
        await this.subscriptionsRepository.findAllByEndpointId(endpoint.id);
      const matched = subscriptions.some((subscription) =>
        this.patternMatcher.matches(event.eventType, subscription.eventPattern),
      );
      if (matched) {
        matchedEndpoints.push(endpoint);
      }
    }

    if (matchedEndpoints.length === 0) {
      event.status = EventStatus.COMPLETED;
      await this.eventsRepository.save(event);
      return;
    }

    event.status = EventStatus.PROCESSING;
    await this.eventsRepository.save(event);

    for (const endpoint of matchedEndpoints) {
      await this.createDeliveryAndPublish(event, endpoint);
    }
  }

  private async createDeliveryAndPublish(
    event: EventEntity,
    endpoint: EndpointEntity,
  ): Promise<void> {
    const insertResult = await this.deliveriesRepository
      .createQueryBuilder()
      .insert()
      .into(DeliveryEntity)
      .values({
        eventId: event.id,
        endpointId: endpoint.id,
        status: DeliveryStatus.PENDING,
      })
      .orIgnore()
      .returning('id')
      .execute();

    const deliveryId: string | undefined = insertResult.raw[0]?.id;
    if (!deliveryId) {
      // Already routed for this event/endpoint pair — a redelivered message. Do not republish.
      return;
    }

    const message: DeliveryRequestedMessage = {
      version: 1,
      deliveryId,
      eventId: event.id,
      endpointId: endpoint.id,
      eventType: event.eventType,
      eventCreatedAt: event.createdAt.toISOString(),
      data: event.payload,
      endpointUrl: endpoint.url,
      endpointTimeoutMs: endpoint.timeoutMs,
    };
    await this.kafkaProducer.publish(DELIVERIES_TOPIC, event.projectId, message);
  }
}
