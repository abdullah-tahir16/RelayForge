import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  DELIVERIES_TOPIC,
  deliveryJobId,
  DeliveryRequestedMessageV3,
} from '@relayforge/kafka-contracts';
import { KafkaProducerService } from '../../kafka/kafka-producer.service';
import { WorkspacesService } from '../../workspaces/services/workspaces.service';
import {
  ReplayDeliveryResponseDto,
  ReplayEventResponseDto,
  ReplaySkipReason,
  ReplayStartKind,
} from '../dto/replay-response.dto';

interface ReplayRow {
  delivery_id: string;
  event_id: string;
  endpoint_id: string;
  delivery_status: string;
  attempt_count: number | string;
  current_run_id: string;
  run_number: number | string;
  run_trigger: string;
  run_status: string;
  initial_job_published_at: Date | string | null;
  project_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  event_created_at: Date | string;
  endpoint_enabled: boolean;
  endpoint_url: string;
  endpoint_timeout_ms: number | string;
}

interface PreparedReplay extends ReplayDeliveryResponseDto {
  projectId: string;
  job: DeliveryRequestedMessageV3;
}

@Injectable()
export class ReplayCoordinatorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly workspacesService: WorkspacesService,
    private readonly producer: KafkaProducerService,
  ) {}

  async replayDelivery(
    userId: string,
    deliveryId: string,
  ): Promise<ReplayDeliveryResponseDto> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(userId);
    const prepared = await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `${replaySelectSql()}
         WHERE d.id = $1 AND p.workspace_id = $2
         FOR UPDATE OF d, r`,
        [deliveryId, workspaceId],
      )) as ReplayRow[];
      const row = rows[0];
      if (!row) throw new NotFoundException('Delivery not found');
      if (!row.endpoint_enabled) {
        throw new ConflictException('Endpoint is disabled');
      }
      return this.prepareOne(manager, row, userId, true);
    });

    try {
      await this.publishPrepared(prepared);
    } catch {
      throw new ServiceUnavailableException({
        message: 'Replay run was persisted but its job could not be published',
        deliveryId: prepared.deliveryId,
        runId: prepared.runId,
        runNumber: prepared.runNumber,
        retryable: true,
      });
    }
    return replayResponse(prepared);
  }

  async replayEvent(
    userId: string,
    eventId: string,
  ): Promise<ReplayEventResponseDto> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(userId);
    const transactionResult = await this.dataSource.transaction(
      async (manager) => {
        const events = (await manager.query(
          `SELECT e.id FROM events e
           JOIN projects p ON p.id = e.project_id
           WHERE e.id = $1 AND p.workspace_id = $2
           FOR UPDATE OF e`,
          [eventId, workspaceId],
        )) as Array<{ id: string }>;
        if (!events[0]) throw new NotFoundException('Event not found');

        const rows = (await manager.query(
          `${replaySelectSql()}
           WHERE d.event_id = $1 AND p.workspace_id = $2
             AND d.status <> 'SUCCEEDED'
           ORDER BY d.id ASC
           FOR UPDATE OF d, r`,
          [eventId, workspaceId],
        )) as ReplayRow[];
        const prepared: PreparedReplay[] = [];
        const skipped: Array<{ deliveryId: string; reason: ReplaySkipReason }> = [];

        for (const row of rows) {
          if (!row.endpoint_enabled) {
            skipped.push({
              deliveryId: row.delivery_id,
              reason: 'endpoint_disabled',
            });
            continue;
          }
          try {
            prepared.push(await this.prepareOne(manager, row, userId, false));
          } catch (error) {
            if (error instanceof ConflictException) {
              skipped.push({
                deliveryId: row.delivery_id,
                reason: conflictReason(row),
              });
              continue;
            }
            throw error;
          }
        }
        if (prepared.length === 0) {
          throw new ConflictException({
            message: 'Event has no eligible failed deliveries to replay',
            skipped,
          });
        }
        return { prepared, skipped };
      },
    );

    const response: ReplayEventResponseDto = {
      started: [],
      resumed: [],
      skipped: transactionResult.skipped,
      publicationFailed: [],
    };
    for (const prepared of transactionResult.prepared) {
      try {
        await this.publishPrepared(prepared);
        response[prepared.status].push(replayResponse(prepared));
      } catch {
        response.publicationFailed.push({
          deliveryId: prepared.deliveryId,
          runId: prepared.runId,
          runNumber: prepared.runNumber,
          reason: 'publication_failed',
        });
      }
    }
    return response;
  }

  private async prepareOne(
    manager: EntityManager,
    row: ReplayRow,
    userId: string,
    allowSucceeded: boolean,
  ): Promise<PreparedReplay> {
    const isResumable =
      row.delivery_status === 'PENDING' &&
      row.run_status === 'PENDING' &&
      row.run_trigger === 'MANUAL' &&
      !row.initial_job_published_at;
    if (isResumable) {
      return buildPrepared(row, row.current_run_id, Number(row.run_number), 'resumed');
    }

    const eligible = ['DEAD_LETTERED', 'FAILED'].includes(row.delivery_status) ||
      (allowSucceeded && row.delivery_status === 'SUCCEEDED');
    if (!eligible) {
      throw new ConflictException(
        activeStatuses().includes(row.delivery_status)
          ? 'Delivery already has active work'
          : 'Delivery is not eligible for replay',
      );
    }

    const runId = randomUUID();
    const runNumber = Number(row.run_number) + 1;
    await manager.query(
      `INSERT INTO delivery_runs (
        id, delivery_id, run_number, trigger, requested_by_user_id,
        status, attempt_count
      ) VALUES ($1, $2, $3, 'MANUAL', $4, 'PENDING', 0)`,
      [runId, row.delivery_id, runNumber, userId],
    );
    await manager.query(
      `UPDATE deliveries SET
        current_run_id = $2, status = 'PENDING', next_attempt_at = NULL,
        completed_at = NULL, failed_at = NULL, dead_lettered_at = NULL,
        http_status_code = NULL, duration_ms = NULL,
        processing_token = NULL, processing_expires_at = NULL, updated_at = now()
       WHERE id = $1`,
      [row.delivery_id, runId],
    );
    await manager.query(
      `UPDATE events SET status = 'PROCESSING' WHERE id = $1`,
      [row.event_id],
    );
    return buildPrepared(row, runId, runNumber, 'started');
  }

  private async publishPrepared(prepared: PreparedReplay): Promise<void> {
    await this.producer.publish(
      DELIVERIES_TOPIC,
      prepared.projectId,
      prepared.job,
    );
    await this.dataSource.query(
      `UPDATE delivery_runs SET initial_job_published_at = now(), updated_at = now()
       WHERE id = $1 AND initial_job_published_at IS NULL`,
      [prepared.runId],
    );
  }
}

function replaySelectSql(): string {
  return `SELECT
      d.id AS delivery_id, d.event_id, d.endpoint_id,
      d.status AS delivery_status, d.attempt_count, d.current_run_id,
      r.run_number, r.trigger AS run_trigger, r.status AS run_status,
      r.initial_job_published_at,
      e.project_id, e.event_type, e.payload, e.created_at AS event_created_at,
      endpoint.enabled AS endpoint_enabled, endpoint.url AS endpoint_url,
      endpoint.timeout_ms AS endpoint_timeout_ms
    FROM deliveries d
    JOIN delivery_runs r ON r.id = d.current_run_id
    JOIN events e ON e.id = d.event_id
    JOIN projects p ON p.id = e.project_id
    JOIN endpoints endpoint ON endpoint.id = d.endpoint_id`;
}

function buildPrepared(
  row: ReplayRow,
  runId: string,
  runNumber: number,
  status: ReplayStartKind,
): PreparedReplay {
  const job: DeliveryRequestedMessageV3 = {
    version: 3,
    jobId: deliveryJobId(runId, 1),
    projectId: row.project_id,
    runId,
    runNumber,
    attemptNumber: Number(row.attempt_count) + 1,
    runAttemptNumber: 1,
    scheduledAt: new Date().toISOString(),
    deliveryId: row.delivery_id,
    eventId: row.event_id,
    endpointId: row.endpoint_id,
    eventType: row.event_type,
    eventCreatedAt: new Date(row.event_created_at).toISOString(),
    data: row.payload,
    endpointUrl: row.endpoint_url,
    endpointTimeoutMs: Number(row.endpoint_timeout_ms),
  };
  return {
    deliveryId: row.delivery_id,
    runId,
    runNumber,
    status,
    projectId: row.project_id,
    job,
  };
}

function replayResponse(prepared: PreparedReplay): ReplayDeliveryResponseDto {
  return {
    deliveryId: prepared.deliveryId,
    runId: prepared.runId,
    runNumber: prepared.runNumber,
    status: prepared.status,
  };
}

function activeStatuses(): string[] {
  return ['PENDING', 'PROCESSING', 'RETRYING'];
}

function conflictReason(row: ReplayRow): ReplaySkipReason {
  return activeStatuses().includes(row.delivery_status)
    ? 'active_run'
    : 'not_eligible';
}
