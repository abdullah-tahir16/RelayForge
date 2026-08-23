import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  deadLetterId,
  DeliveryDeadLetteredMessageV1,
  NormalizedDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { PoolClient } from 'pg';
import { PgPoolService } from './pg-pool.service';

export type ClaimStatus =
  | 'claimed'
  | 'active_duplicate'
  | 'completed_duplicate'
  | 'stale_run'
  | 'retry_publication_required'
  | 'dead_letter_publication_required'
  | 'terminal_legacy'
  | 'not_due'
  | 'missing';

export interface ClaimResult {
  status: ClaimStatus;
  processingToken?: string;
  projectId?: string;
  runId?: string;
  runNumber?: number;
  attemptNumber?: number;
  runAttemptNumber?: number;
  nextAttemptAt?: Date;
  completedAttempts?: number;
  completedRunAttempts?: number;
  deadLetter?: DeliveryDeadLetteredMessageV1;
}

export interface AttemptDiagnostics {
  requestHeaders: Record<string, string>;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBodyPreview: string | null;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface CompletionResult {
  state: 'SUCCEEDED' | 'RETRYING' | 'DEAD_LETTERED';
  nextAttemptAt: Date | null;
  deadLetter?: DeliveryDeadLetteredMessageV1;
}

interface LockedDeliveryRunRow {
  delivery_id: string;
  event_id: string;
  endpoint_id: string;
  delivery_status: string;
  delivery_attempt_count: number | string;
  current_run_id: string;
  next_attempt_at: Date | string | null;
  processing_token: string | null;
  processing_expires_at: Date | string | null;
  project_id: string;
  run_id: string;
  run_number: number | string;
  run_trigger: string;
  run_status: string;
  run_attempt_limit: number | string | null;
  run_attempt_count: number | string;
  dlq_published_at: Date | string | null;
}

@Injectable()
export class DeliveriesSqlRepository {
  constructor(private readonly pgPool: PgPoolService) {}

  async claimAttempt(
    message: NormalizedDeliveryRequestedMessage,
    requestHeaders: Record<string, string>,
    leaseMs: number,
    configuredAttemptLimit: number,
  ): Promise<ClaimResult> {
    const client = await this.pgPool.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<LockedDeliveryRunRow>(
        `SELECT
           d.id AS delivery_id, d.event_id, d.endpoint_id,
           d.status AS delivery_status, d.attempt_count AS delivery_attempt_count,
           d.current_run_id, d.next_attempt_at, d.processing_token,
           d.processing_expires_at, e.project_id,
           r.id AS run_id, r.run_number, r.trigger AS run_trigger,
           r.status AS run_status, r.attempt_limit AS run_attempt_limit,
           r.attempt_count AS run_attempt_count, r.dlq_published_at
         FROM deliveries d
         JOIN events e ON e.id = d.event_id
         JOIN delivery_runs r ON r.id = d.current_run_id
         WHERE d.id = $1
         FOR UPDATE OF d, r`,
        [message.deliveryId],
      );
      const row = result.rows[0];
      if (!row) return commitResult(client, { status: 'missing' });

      const projectId = row.project_id;
      const currentRunId = row.run_id;
      const currentRunNumber = Number(row.run_number);
      const runAttemptNumber =
        message.sourceVersion === 3
          ? message.runAttemptNumber
          : message.attemptNumber;
      const runMatches =
        message.sourceVersion === 3
          ? message.runId === currentRunId &&
            message.runNumber === currentRunNumber &&
            runAttemptNumber !== undefined
          : currentRunNumber === 1 && row.run_trigger === 'INITIAL';

      if (!runMatches) {
        if (message.sourceVersion === 3 && message.runId) {
          const deadLetter = await this.loadUnpublishedDeadLetter(
            client,
            message.deliveryId,
            message.runId,
          );
          if (deadLetter) {
            return commitResult(client, {
              status: 'dead_letter_publication_required',
              projectId,
              runId: message.runId,
              deadLetter,
            });
          }
        }
        return commitResult(client, { status: 'stale_run', projectId });
      }

      const completedAttempts = Number(row.delivery_attempt_count);
      const completedRunAttempts = Number(row.run_attempt_count);
      const context = {
        projectId,
        runId: currentRunId,
        runNumber: currentRunNumber,
        attemptNumber: message.attemptNumber,
        runAttemptNumber,
        completedAttempts,
        completedRunAttempts,
      };

      if (row.delivery_status === 'FAILED' || row.run_status === 'FAILED') {
        return commitResult(client, { status: 'terminal_legacy', ...context });
      }
      if (row.run_status === 'DEAD_LETTERED') {
        if (!row.dlq_published_at) {
          const deadLetter = await this.loadUnpublishedDeadLetter(
            client,
            message.deliveryId,
            currentRunId,
          );
          if (!deadLetter) {
            throw new Error(`Dead-lettered run ${currentRunId} has no safe envelope`);
          }
          return commitResult(client, {
            status: 'dead_letter_publication_required',
            ...context,
            deadLetter,
          });
        }
        return commitResult(client, { status: 'completed_duplicate', ...context });
      }
      if (row.run_status === 'SUCCEEDED') {
        return commitResult(client, { status: 'completed_duplicate', ...context });
      }
      if (runAttemptNumber === undefined) {
        return commitResult(client, { status: 'stale_run', projectId });
      }
      if (
        completedAttempts >= message.attemptNumber ||
        completedRunAttempts >= runAttemptNumber
      ) {
        if (
          row.run_status === 'RETRYING' &&
          completedAttempts === message.attemptNumber &&
          completedRunAttempts === runAttemptNumber
        ) {
          return commitResult(client, {
            status: 'retry_publication_required',
            ...context,
            nextAttemptAt: row.next_attempt_at
              ? new Date(row.next_attempt_at)
              : undefined,
          });
        }
        return commitResult(client, { status: 'completed_duplicate', ...context });
      }
      if (
        completedAttempts !== message.attemptNumber - 1 ||
        completedRunAttempts !== runAttemptNumber - 1
      ) {
        return commitResult(client, { status: 'active_duplicate', ...context });
      }

      const attemptLimit = row.run_attempt_limit
        ? Number(row.run_attempt_limit)
        : configuredAttemptLimit;
      if (runAttemptNumber > attemptLimit) {
        return commitResult(client, { status: 'stale_run', ...context });
      }
      const now = Date.now();
      if (
        row.next_attempt_at &&
        new Date(row.next_attempt_at).getTime() > now
      ) {
        return commitResult(client, {
          status: 'not_due',
          ...context,
          nextAttemptAt: new Date(row.next_attempt_at),
        });
      }
      if (
        row.delivery_status === 'PROCESSING' &&
        row.processing_expires_at &&
        new Date(row.processing_expires_at).getTime() > now
      ) {
        return commitResult(client, { status: 'active_duplicate', ...context });
      }

      const processingToken = randomUUID();
      await client.query(
        `UPDATE delivery_runs
         SET status = 'PROCESSING', attempt_limit = COALESCE(attempt_limit, $2),
             started_at = COALESCE(started_at, now()), updated_at = now()
         WHERE id = $1`,
        [currentRunId, configuredAttemptLimit],
      );
      await client.query(
        `UPDATE deliveries
         SET status = 'PROCESSING', processing_token = $2,
             processing_expires_at = now() + ($3 * interval '1 millisecond'),
             next_attempt_at = NULL, updated_at = now()
         WHERE id = $1`,
        [message.deliveryId, processingToken, leaseMs],
      );
      const attempt = await client.query(
        `INSERT INTO delivery_attempts (
           delivery_id, run_id, attempt_number, run_attempt_number,
           request_headers, started_at
         ) VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (delivery_id, attempt_number) DO UPDATE
         SET request_headers = EXCLUDED.request_headers,
             started_at = now(), completed_at = NULL,
             response_status = NULL, response_headers = NULL,
             response_body_preview = NULL, duration_ms = NULL,
             error_code = NULL, error_message = NULL
         WHERE delivery_attempts.completed_at IS NULL
           AND delivery_attempts.run_id = EXCLUDED.run_id
           AND delivery_attempts.run_attempt_number = EXCLUDED.run_attempt_number
         RETURNING id`,
        [
          message.deliveryId,
          currentRunId,
          message.attemptNumber,
          runAttemptNumber,
          JSON.stringify(requestHeaders),
        ],
      );
      if (attempt.rowCount !== 1) {
        throw new Error('Attempt row could not be inserted or resumed safely');
      }
      await client.query('COMMIT');
      return { status: 'claimed', ...context, processingToken };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async completeAttempt(
    deliveryId: string,
    runId: string,
    attemptNumber: number,
    runAttemptNumber: number,
    processingToken: string,
    diagnostics: AttemptDiagnostics,
    nextRetryDelayMs: number | null,
  ): Promise<CompletionResult> {
    const client = await this.pgPool.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT d.event_id, d.endpoint_id, d.current_run_id, d.processing_token,
                e.project_id, r.run_number
         FROM deliveries d
         JOIN events e ON e.id = d.event_id
         JOIN delivery_runs r ON r.id = d.current_run_id
         WHERE d.id = $1
         FOR UPDATE OF d, r`,
        [deliveryId],
      );
      const row = result.rows[0];
      if (
        !row ||
        row.current_run_id !== runId ||
        row.processing_token !== processingToken
      ) {
        throw new Error(`Delivery ${deliveryId} processing ownership was lost`);
      }
      const completed = await client.query(
        `UPDATE delivery_attempts
         SET response_status = $5, response_headers = $6,
             response_body_preview = $7, duration_ms = $8,
             error_code = $9, error_message = $10, completed_at = now()
         WHERE delivery_id = $1 AND run_id = $2
           AND attempt_number = $3 AND run_attempt_number = $4
           AND completed_at IS NULL
         RETURNING id`,
        [
          deliveryId,
          runId,
          attemptNumber,
          runAttemptNumber,
          diagnostics.responseStatus,
          diagnostics.responseHeaders
            ? JSON.stringify(diagnostics.responseHeaders)
            : null,
          diagnostics.responseBodyPreview,
          diagnostics.durationMs,
          diagnostics.errorCode,
          diagnostics.errorMessage,
        ],
      );
      if (completed.rowCount !== 1) {
        throw new Error('Attempt was already completed or does not match its run');
      }

      const succeeded =
        diagnostics.responseStatus !== null &&
        diagnostics.responseStatus >= 200 &&
        diagnostics.responseStatus < 300;
      const state: CompletionResult['state'] = succeeded
        ? 'SUCCEEDED'
        : nextRetryDelayMs !== null
          ? 'RETRYING'
          : 'DEAD_LETTERED';
      const now = new Date();
      const nextAttemptAt =
        state === 'RETRYING'
          ? new Date(now.getTime() + (nextRetryDelayMs ?? 0))
          : null;

      await client.query(
        `UPDATE delivery_runs
         SET status = $2::delivery_runs_status_enum, attempt_count = $3,
             completed_at = CASE WHEN $2::text = 'SUCCEEDED' THEN $4::timestamptz ELSE NULL END,
             failed_at = CASE WHEN $2::text = 'DEAD_LETTERED' THEN $4::timestamptz ELSE NULL END,
             dead_lettered_at = CASE WHEN $2::text = 'DEAD_LETTERED' THEN $4::timestamptz ELSE NULL END,
             updated_at = $4::timestamptz
         WHERE id = $1`,
        [runId, state, runAttemptNumber, now],
      );
      await client.query(
        `UPDATE deliveries
         SET status = $2::deliveries_status_enum, attempt_count = $3,
             next_attempt_at = $4,
             completed_at = CASE WHEN $2::text = 'SUCCEEDED' THEN $5::timestamptz ELSE NULL END,
             failed_at = CASE WHEN $2::text = 'DEAD_LETTERED' THEN $5::timestamptz ELSE NULL END,
             dead_lettered_at = CASE WHEN $2::text = 'DEAD_LETTERED' THEN $5::timestamptz ELSE NULL END,
             http_status_code = $6, duration_ms = $7,
             processing_token = NULL, processing_expires_at = NULL,
             updated_at = $5::timestamptz
         WHERE id = $1 AND current_run_id = $8 AND processing_token = $9`,
        [
          deliveryId,
          state,
          attemptNumber,
          nextAttemptAt,
          now,
          diagnostics.responseStatus,
          diagnostics.durationMs,
          runId,
          processingToken,
        ],
      );
      await aggregateEventStatus(client, row.event_id);

      let deadLetter: DeliveryDeadLetteredMessageV1 | undefined;
      if (state === 'DEAD_LETTERED') {
        deadLetter = buildDeadLetterMessage({
          projectId: row.project_id,
          eventId: row.event_id,
          deliveryId,
          endpointId: row.endpoint_id,
          runId,
          runNumber: Number(row.run_number),
          attemptCount: runAttemptNumber,
          finalAttemptNumber: attemptNumber,
          finalRunAttemptNumber: runAttemptNumber,
          responseStatus: diagnostics.responseStatus,
          errorCode: diagnostics.errorCode,
          deadLetteredAt: now,
        });
      }
      await client.query('COMMIT');
      return { state, nextAttemptAt, deadLetter };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async markDeadLetterPublished(
    runId: string,
    publishedAt = new Date(),
  ): Promise<void> {
    await this.pgPool.pool.query(
      `UPDATE delivery_runs SET dlq_published_at = $2, updated_at = now()
       WHERE id = $1 AND dlq_published_at IS NULL`,
      [runId, publishedAt],
    );
  }

  async aggregateEventStatus(eventId: string): Promise<void> {
    const client = await this.pgPool.pool.connect();
    try {
      await aggregateEventStatus(client, eventId);
    } finally {
      client.release();
    }
  }

  private async loadUnpublishedDeadLetter(
    client: PoolClient,
    deliveryId: string,
    runId: string,
  ): Promise<DeliveryDeadLetteredMessageV1 | undefined> {
    const result = await client.query(
      `SELECT e.project_id, d.event_id, d.endpoint_id,
              r.id AS run_id, r.run_number, r.attempt_count,
              r.dead_lettered_at, a.attempt_number, a.run_attempt_number,
              a.response_status, a.error_code
       FROM delivery_runs r
       JOIN deliveries d ON d.id = r.delivery_id
       JOIN events e ON e.id = d.event_id
       LEFT JOIN delivery_attempts a
         ON a.run_id = r.id AND a.run_attempt_number = r.attempt_count
       WHERE d.id = $1 AND r.id = $2
         AND r.status = 'DEAD_LETTERED' AND r.dlq_published_at IS NULL`,
      [deliveryId, runId],
    );
    const row = result.rows[0];
    if (!row?.dead_lettered_at || !row?.attempt_number) return undefined;
    return buildDeadLetterMessage({
      projectId: row.project_id,
      eventId: row.event_id,
      deliveryId,
      endpointId: row.endpoint_id,
      runId: row.run_id,
      runNumber: Number(row.run_number),
      attemptCount: Number(row.attempt_count),
      finalAttemptNumber: Number(row.attempt_number),
      finalRunAttemptNumber: Number(row.run_attempt_number),
      responseStatus:
        row.response_status === null ? null : Number(row.response_status),
      errorCode: row.error_code,
      deadLetteredAt: new Date(row.dead_lettered_at),
    });
  }
}

async function aggregateEventStatus(
  client: Pick<PoolClient, 'query'>,
  eventId: string,
): Promise<void> {
  await client.query(
    `WITH counts AS (
       SELECT
         COUNT(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING', 'RETRYING')) AS active,
         COUNT(*) FILTER (WHERE status = 'SUCCEEDED') AS succeeded,
         COUNT(*) FILTER (WHERE status IN ('FAILED', 'DEAD_LETTERED')) AS failed
       FROM deliveries WHERE event_id = $1
     )
     UPDATE events
     SET status = (CASE
       WHEN (SELECT active FROM counts) > 0 THEN 'PROCESSING'
       WHEN (SELECT failed FROM counts) = 0 THEN 'COMPLETED'
       WHEN (SELECT succeeded FROM counts) = 0 THEN 'FAILED'
       ELSE 'PARTIALLY_FAILED'
     END)::events_status_enum
     WHERE id = $1`,
    [eventId],
  );
}

function buildDeadLetterMessage(input: {
  projectId: string;
  eventId: string;
  deliveryId: string;
  endpointId: string;
  runId: string;
  runNumber: number;
  attemptCount: number;
  finalAttemptNumber: number;
  finalRunAttemptNumber: number;
  responseStatus: number | null;
  errorCode: string | null;
  deadLetteredAt: Date;
}): DeliveryDeadLetteredMessageV1 {
  const failureKind =
    input.responseStatus !== null
      ? 'HTTP'
      : input.errorCode?.toUpperCase().includes('TIMEOUT')
        ? 'TIMEOUT'
        : 'NETWORK';
  const safeErrorCode = input.errorCode?.match(/^[A-Z0-9_-]{1,64}$/i)
    ? input.errorCode.toUpperCase()
    : 'DELIVERY_FAILED';
  return {
    version: 1,
    deadLetterId: deadLetterId(input.runId),
    projectId: input.projectId,
    eventId: input.eventId,
    deliveryId: input.deliveryId,
    endpointId: input.endpointId,
    runId: input.runId,
    runNumber: input.runNumber,
    attemptCount: input.attemptCount,
    finalAttemptNumber: input.finalAttemptNumber,
    finalRunAttemptNumber: input.finalRunAttemptNumber,
    failureKind,
    failureReason:
      input.responseStatus !== null
        ? `HTTP_${input.responseStatus}`
        : safeErrorCode,
    finalHttpStatus: input.responseStatus,
    deadLetteredAt: input.deadLetteredAt.toISOString(),
  };
}

async function commitResult(
  client: PoolClient,
  result: ClaimResult,
): Promise<ClaimResult> {
  await client.query('COMMIT');
  return result;
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Preserve the original transaction failure.
  }
}
