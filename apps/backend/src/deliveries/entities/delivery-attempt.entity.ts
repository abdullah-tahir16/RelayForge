import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'delivery_attempts' })
@Index(['deliveryId', 'attemptNumber'], { unique: true })
@Index(['runId', 'runAttemptNumber'], { unique: true })
export class DeliveryAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'delivery_id' })
  deliveryId: string;

  @Column({ type: 'uuid', name: 'run_id' })
  @Index()
  runId: string;

  @Column({ type: 'int', name: 'attempt_number' })
  attemptNumber: number;

  @Column({ type: 'int', name: 'run_attempt_number' })
  runAttemptNumber: number;

  @Column({ type: 'jsonb', name: 'request_headers', nullable: true })
  requestHeaders: Record<string, string> | null;

  @Column({ type: 'int', name: 'response_status', nullable: true })
  responseStatus: number | null;

  @Column({ type: 'jsonb', name: 'response_headers', nullable: true })
  responseHeaders: Record<string, string> | null;

  @Column({ type: 'text', name: 'response_body_preview', nullable: true })
  responseBodyPreview: string | null;

  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs: number | null;

  @Column({ type: 'varchar', name: 'error_code', nullable: true })
  errorCode: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
