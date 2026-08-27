import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  DELIVERIES_TOPIC,
  deliveryJobId,
  DeliveryRequestedMessageV4,
} from '@relayforge/kafka-contracts';
import { RouteEventCommand } from '../impl/route-event.command';
import { EventEntity, EventStatus } from '../../../events/entities/event.entity';
import { DeliveryEntity, DeliveryStatus } from '../../entities/delivery.entity';
import { EventPatternMatcherService } from '../../services/event-pattern-matcher.service';
import { EndpointsRepository } from '../../../endpoints/repositories/endpoints.repository';
import { SubscriptionsRepository } from '../../../subscriptions/repositories/subscriptions.repository';
import { EndpointEntity } from '../../../endpoints/entities/endpoint.entity';
import { KafkaProducerService } from '../../../kafka/kafka-producer.service';
import {
  DeliveryRunEntity,
  DeliveryRunStatus,
  DeliveryRunTrigger,
} from '../../entities/delivery-run.entity';

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
      await this.endpointsRepository.findAllEnabledWithSigningByProjectId(
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
    const route = await this.deliveriesRepository.manager.transaction(
      async (manager) => {
        const deliveryId = randomUUID();
        const runId = randomUUID();
        const insertResult = await manager
          .createQueryBuilder()
          .insert()
          .into(DeliveryEntity)
          .values({
            id: deliveryId,
            eventId: event.id,
            endpointId: endpoint.id,
            status: DeliveryStatus.PENDING,
            currentRunId: runId,
          })
          .orIgnore()
          .returning('id')
          .execute();

        if (insertResult.raw[0]?.id) {
          await manager.insert(DeliveryRunEntity, {
            id: runId,
            deliveryId,
            runNumber: 1,
            trigger: DeliveryRunTrigger.INITIAL,
            status: DeliveryRunStatus.PENDING,
            attemptCount: 0,
          });
          return { deliveryId, runId, shouldPublish: true };
        }

        const existing = await manager.findOne(DeliveryEntity, {
          where: { eventId: event.id, endpointId: endpoint.id },
        });
        if (!existing) {
          throw new Error('Duplicate routed Delivery could not be reloaded');
        }
        const initialRun = await manager.findOne(DeliveryRunEntity, {
          where: {
            id: existing.currentRunId,
            deliveryId: existing.id,
            runNumber: 1,
            trigger: DeliveryRunTrigger.INITIAL,
          },
        });
        return {
          deliveryId: existing.id,
          runId: initialRun?.id,
          shouldPublish: Boolean(initialRun && !initialRun.initialJobPublishedAt),
        };
      },
    );

    if (!route.runId || !route.shouldPublish) return;

    const message: DeliveryRequestedMessageV4 = {
      version: 4,
      jobId: deliveryJobId(route.runId, 1),
      projectId: event.projectId,
      runId: route.runId,
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: new Date().toISOString(),
      deliveryId: route.deliveryId,
      eventId: event.id,
      endpointId: endpoint.id,
      eventType: event.eventType,
      eventCreatedAt: event.createdAt.toISOString(),
      data: event.payload,
      endpointUrl: endpoint.url,
      endpointTimeoutMs: endpoint.timeoutMs,
      endpointSigningSecretEncrypted: endpoint.signingSecretEncrypted,
      endpointSigningSecretVersion: endpoint.signingSecretVersion,
    };
    await this.kafkaProducer.publish(DELIVERIES_TOPIC, event.projectId, message);
    await this.deliveriesRepository.manager
      .createQueryBuilder()
      .update(DeliveryRunEntity)
      .set({ initialJobPublishedAt: new Date() })
      .where('id = :runId', { runId: route.runId })
      .andWhere('initial_job_published_at IS NULL')
      .execute();
  }
}
