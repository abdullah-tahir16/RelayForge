import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  DELIVERIES_TOPIC,
  deliveryJobId,
  DeliveryRequestedMessageV4,
} from '@relayforge/kafka-contracts';
import { TestEndpointCommand } from '../impl/test-endpoint.command';
import { EndpointTestDeliveryResponseDto } from '../../dto/endpoint-test-delivery-response.dto';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';
import { KafkaProducerService } from '../../../kafka/kafka-producer.service';
import {
  ENDPOINT_TEST_EVENT_TYPE,
  buildEndpointTestPayload,
} from '../../../events/services/event-source';
import {
  EventEntity,
  EventSource,
  EventStatus,
} from '../../../events/entities/event.entity';
import { DeliveryEntity, DeliveryStatus } from '../../../deliveries/entities/delivery.entity';
import {
  DeliveryRunEntity,
  DeliveryRunStatus,
  DeliveryRunTrigger,
} from '../../../deliveries/entities/delivery-run.entity';
import { EndpointEntity } from '../../entities/endpoint.entity';

interface EndpointWithSigning {
  id: string;
  projectId: string;
  url: string;
  timeoutMs: number;
  enabled: boolean;
  signingSecretEncrypted: string;
  signingSecretVersion: number;
}

@CommandHandler(TestEndpointCommand)
export class TestEndpointHandler
  implements ICommandHandler<TestEndpointCommand, EndpointTestDeliveryResponseDto>
{
  constructor(
    private readonly authorization: EndpointAuthorizationService,
    private readonly dataSource: DataSource,
    private readonly producer: KafkaProducerService,
  ) {}

  async execute(
    command: TestEndpointCommand,
  ): Promise<EndpointTestDeliveryResponseDto> {
    const endpoint = await this.authorization.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );
    if (!endpoint.enabled) {
      throw new ConflictException('Endpoint is disabled');
    }

    const endpointWithSigning = await this.loadEndpointWithSigning(endpoint.id);
    if (!endpointWithSigning) {
      throw new NotFoundException('Endpoint not found');
    }
    if (!endpointWithSigning.enabled) {
      throw new ConflictException('Endpoint is disabled');
    }

    const prepared = await this.dataSource.transaction(async (manager) => {
      const eventRepository = manager.getRepository(EventEntity);
      const event = await eventRepository.save(
        eventRepository.create({
          projectId: endpointWithSigning.projectId,
          eventType: ENDPOINT_TEST_EVENT_TYPE,
          payload: buildEndpointTestPayload(endpointWithSigning.id),
          metadata: null,
          source: EventSource.ENDPOINT_TEST,
          testTargetEndpointId: endpointWithSigning.id,
          status: EventStatus.PROCESSING,
          publishedAt: null,
        }),
      );
      const deliveryId = randomUUID();
      const runId = randomUUID();

      await manager.save(
        manager.create(DeliveryEntity, {
          id: deliveryId,
          eventId: event.id,
          endpointId: endpointWithSigning.id,
          status: DeliveryStatus.PENDING,
          currentRunId: runId,
        }),
      );
      await manager.save(
        manager.create(DeliveryRunEntity, {
          id: runId,
          deliveryId,
          runNumber: 1,
          trigger: DeliveryRunTrigger.INITIAL,
          status: DeliveryRunStatus.PENDING,
          attemptCount: 0,
        }),
      );

      const message: DeliveryRequestedMessageV4 = {
        version: 4,
        jobId: deliveryJobId(runId, 1),
        projectId: endpointWithSigning.projectId,
        runId,
        runNumber: 1,
        attemptNumber: 1,
        runAttemptNumber: 1,
        scheduledAt: new Date().toISOString(),
        deliveryId,
        eventId: event.id,
        endpointId: endpointWithSigning.id,
        eventType: event.eventType,
        eventCreatedAt: event.createdAt.toISOString(),
        data: event.payload,
        endpointUrl: endpointWithSigning.url,
        endpointTimeoutMs: endpointWithSigning.timeoutMs,
        endpointSigningSecretEncrypted:
          endpointWithSigning.signingSecretEncrypted,
        endpointSigningSecretVersion:
          endpointWithSigning.signingSecretVersion,
      };

      return {
        response: {
          eventId: event.id,
          deliveryId,
          runId,
          runNumber: 1,
          status: 'started' as const,
        },
        projectId: endpointWithSigning.projectId,
        message,
      };
    });

    try {
      await this.producer.publish(
        DELIVERIES_TOPIC,
        prepared.projectId,
        prepared.message,
      );
    } catch {
      throw new ServiceUnavailableException({
        message: 'Endpoint test was persisted but its job could not be published',
        eventId: prepared.response.eventId,
        deliveryId: prepared.response.deliveryId,
        runId: prepared.response.runId,
        retryable: true,
      });
    }

    await this.dataSource.query(
      `UPDATE delivery_runs
       SET initial_job_published_at = now(), updated_at = now()
       WHERE id = $1 AND initial_job_published_at IS NULL`,
      [prepared.response.runId],
    );
    await this.dataSource.query(
      `UPDATE events
       SET published_at = now()
       WHERE id = $1 AND published_at IS NULL`,
      [prepared.response.eventId],
    );

    return prepared.response;
  }

  private async loadEndpointWithSigning(
    endpointId: string,
  ): Promise<EndpointWithSigning | null> {
    const endpoint = await this.dataSource
      .getRepository(EndpointEntity)
      .createQueryBuilder('endpoint')
      .addSelect('endpoint.signingSecretEncrypted')
      .where('endpoint.id = :endpointId', { endpointId })
      .getOne();
    return endpoint
      ? {
          id: endpoint.id,
          projectId: endpoint.projectId,
          url: endpoint.url,
          timeoutMs: endpoint.timeoutMs,
          enabled: endpoint.enabled,
          signingSecretEncrypted: endpoint.signingSecretEncrypted,
          signingSecretVersion: endpoint.signingSecretVersion,
        }
      : null;
  }
}
