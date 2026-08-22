import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PgPoolService } from './pg-pool.service';

export type ClaimStatus =
  | 'claimed'
  | 'active_duplicate'
  | 'completed_duplicate'
  | 'retry_required'
  | 'terminal'
  | 'not_due'
  | 'missing';

export interface ClaimResult {
  status: ClaimStatus;
  processingToken?: string;
  projectId?: string;
  nextAttemptAt?: Date;
  completedAttempts?: number;
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
  state: 'SUCCEEDED' | 'RETRYING' | 'FAILED';
  nextAttemptAt: Date | null;
}

@Injectable()
export class DeliveriesSqlRepository {
  constructor(private readonly pgPool: PgPoolService) {}

  async claimAttempt(
    deliveryId: string,
    attemptNumber: number,
    requestHeaders: Record<string, string>,
    leaseMs: number,
  ): Promise<ClaimResult> {
    const client = await this.pgPool.pool.connect();
    try {
      await client.query('BEGIN');
      const deliveryResult = await client.query(
        `SELECT d.status, d.attempt_count, d.next_attempt_at,
                d.processing_expires_at, e.project_id
         FROM deliveries d
         JOIN events e ON e.id = d.event_id
         WHERE d.id = $1
         FOR UPDATE OF d`,
        [deliveryId],
      );
      const delivery = deliveryResult.rows[0];
      if (!delivery) {
        await client.query('COMMIT');
        return { status: 'missing' };
      }
      const projectId = delivery.project_id as string;
      const completedAttempts = Number(delivery.attempt_count);
      if (delivery.status === 'SUCCEEDED' || delivery.status === 'FAILED') {
        await client.query('COMMIT');
        return { status: 'terminal', projectId };
      }
      if (completedAttempts >= attemptNumber) {
        const retryRequired = delivery.status === 'RETRYING';
        await client.query('COMMIT');
        return {
          status: retryRequired ? 'retry_required' : 'completed_duplicate',
          projectId,
          nextAttemptAt: delivery.next_attempt_at
            ? new Date(delivery.next_attempt_at)
            : undefined,
          completedAttempts,
        };
      }
      if (completedAttempts !== attemptNumber - 1) {
        await client.query('COMMIT');
        return { status: 'active_duplicate', projectId };
      }
      const now = Date.now();
      if (
        delivery.next_attempt_at &&
        new Date(delivery.next_attempt_at).getTime() > now
      ) {
        await client.query('COMMIT');
        return {
          status: 'not_due',
          projectId,
          nextAttemptAt: new Date(delivery.next_attempt_at),
        };
      }
      if (
        delivery.status === 'PROCESSING' &&
        delivery.processing_expires_at &&
        new Date(delivery.processing_expires_at).getTime() > now
      ) {
        await client.query('COMMIT');
        return { status: 'active_duplicate', projectId };
      }

      const processingToken = randomUUID();
      await client.query(
        `UPDATE deliveries
         SET status = 'PROCESSING', processing_token = $2,
             processing_expires_at = now() + ($3 * interval '1 millisecond'),
             next_attempt_at = NULL, updated_at = now()
         WHERE id = $1`,
        [deliveryId, processingToken, leaseMs],
      );
      await client.query(
        `INSERT INTO delivery_attempts (
           delivery_id, attempt_number, request_headers, started_at
         ) VALUES ($1, $2, $3, now())
         ON CONFLICT (delivery_id, attempt_number) DO UPDATE
         SET request_headers = EXCLUDED.request_headers,
             started_at = now(), completed_at = NULL,
             response_status = NULL, response_headers = NULL,
             response_body_preview = NULL, duration_ms = NULL,
             error_code = NULL, error_message = NULL
         WHERE delivery_attempts.completed_at IS NULL`,
        [deliveryId, attemptNumber, JSON.stringify(requestHeaders)],
      );
      await client.query('COMMIT');
      return { status: 'claimed', processingToken, projectId };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async completeAttempt(
    deliveryId: string,
    attemptNumber: number,
    processingToken: string,
    diagnostics: AttemptDiagnostics,
    nextRetryDelayMs: number | null,
  ): Promise<CompletionResult> {
    const client = await this.pgPool.pool.connect();
    try {
      await client.query('BEGIN');
      const row = await client.query(
        `SELECT processing_token FROM deliveries WHERE id = $1 FOR UPDATE`,
        [deliveryId],
      );
      if (row.rows[0]?.processing_token !== processingToken) {
        throw new Error(`Delivery ${deliveryId} processing ownership was lost`);
      }
      await client.query(
        `UPDATE delivery_attempts
         SET response_status = $3, response_headers = $4,
             response_body_preview = $5, duration_ms = $6,
             error_code = $7, error_message = $8, completed_at = now()
         WHERE delivery_id = $1 AND attempt_number = $2`,
        [
          deliveryId,
          attemptNumber,
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

      const succeeded =
        diagnostics.responseStatus !== null &&
        diagnostics.responseStatus >= 200 &&
        diagnostics.responseStatus < 300;
      let state: CompletionResult['state'];
      let nextAttemptAt: Date | null = null;
      if (succeeded) {
        state = 'SUCCEEDED';
      } else if (nextRetryDelayMs !== null) {
        state = 'RETRYING';
        nextAttemptAt = new Date(Date.now() + nextRetryDelayMs);
      } else {
        state = 'FAILED';
      }

      await client.query(
        `UPDATE deliveries
         SET status = $2::deliveries_status_enum, attempt_count = $3,
             next_attempt_at = $4,
             completed_at = $5, failed_at = $6,
             http_status_code = $7, duration_ms = $8,
             processing_token = NULL, processing_expires_at = NULL,
             updated_at = now()
         WHERE id = $1 AND processing_token = $9`,
        [
          deliveryId,
          state,
          attemptNumber,
          nextAttemptAt,
          state === 'SUCCEEDED' ? new Date() : null,
          state === 'FAILED' ? new Date() : null,
          diagnostics.responseStatus,
          diagnostics.durationMs,
          processingToken,
        ],
      );
      await client.query('COMMIT');
      return { state, nextAttemptAt };
    } catch (error) {
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async aggregateEventStatus(eventId: string): Promise<void> {
    await this.pgPool.pool.query(
      `WITH counts AS (
         SELECT
           COUNT(*) FILTER (WHERE status IN ('PENDING', 'PROCESSING', 'RETRYING')) AS active,
           COUNT(*) FILTER (WHERE status = 'SUCCEEDED') AS succeeded,
           COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
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
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Preserve the original transaction failure.
  }
}
