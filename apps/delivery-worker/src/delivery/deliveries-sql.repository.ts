import { Injectable } from '@nestjs/common';
import { PgPoolService } from './pg-pool.service';

export type DeliveryOutcome = 'SUCCEEDED' | 'FAILED';

/**
 * Deliberately raw SQL, not TypeORM — design.md Decision 3. The worker never
 * reads `endpoints`/`subscriptions`/`events`; its only DB access is these two
 * guarded statements against `deliveries` and one aggregate write to `events`.
 */
@Injectable()
export class DeliveriesSqlRepository {
  constructor(private readonly pgPool: PgPoolService) {}

  async getStatus(deliveryId: string): Promise<string | null> {
    const result = await this.pgPool.pool.query(
      `SELECT status FROM deliveries WHERE id = $1`,
      [deliveryId],
    );
    return result.rows[0]?.status ?? null;
  }

  /** Returns false if the row was already SUCCEEDED/FAILED (a redelivery) — the caller should not re-aggregate. */
  async resolveDelivery(
    deliveryId: string,
    outcome: DeliveryOutcome,
    httpStatusCode: number | null,
    durationMs: number,
  ): Promise<boolean> {
    const timestampColumn =
      outcome === 'SUCCEEDED' ? 'completed_at' : 'failed_at';
    const result = await this.pgPool.pool.query(
      `UPDATE deliveries
       SET status = $1, attempt_count = attempt_count + 1, ${timestampColumn} = now(), updated_at = now(),
           http_status_code = $3, duration_ms = $4
       WHERE id = $2 AND status NOT IN ('SUCCEEDED', 'FAILED')`,
      [outcome, deliveryId, httpStatusCode, durationMs],
    );
    return result.rowCount === 1;
  }

  /** No-op while any delivery for the event is still non-terminal. */
  async aggregateEventStatus(eventId: string): Promise<void> {
    await this.pgPool.pool.query(
      `WITH counts AS (
         SELECT
           COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
           COUNT(*) FILTER (WHERE status = 'SUCCEEDED') AS succeeded,
           COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
         FROM deliveries WHERE event_id = $1
       )
       UPDATE events
       SET status = CASE
         WHEN (SELECT pending FROM counts) > 0 THEN status
         WHEN (SELECT failed FROM counts) = 0 THEN 'COMPLETED'
         WHEN (SELECT succeeded FROM counts) = 0 THEN 'FAILED'
         ELSE 'PARTIALLY_FAILED'
       END
       WHERE id = $1`,
      [eventId],
    );
  }
}
