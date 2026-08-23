import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryStatus } from './delivery.entity';

export enum DeliveryRunTrigger {
  INITIAL = 'INITIAL',
  MANUAL = 'MANUAL',
}

export enum DeliveryRunStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RETRYING = 'RETRYING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  DEAD_LETTERED = 'DEAD_LETTERED',
}

@Entity({ name: 'delivery_runs' })
@Index(['deliveryId', 'runNumber'], { unique: true })
@Index('UQ_delivery_runs_one_active', ['deliveryId'], {
  unique: true,
  where: `status IN ('PENDING', 'PROCESSING', 'RETRYING')`,
})
export class DeliveryRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'delivery_id' })
  @Index()
  deliveryId: string;

  @Column({ type: 'int', name: 'run_number' })
  runNumber: number;

  @Column({
    type: 'enum',
    enum: DeliveryRunTrigger,
    enumName: 'delivery_runs_trigger_enum',
  })
  trigger: DeliveryRunTrigger;

  @Column({ type: 'uuid', name: 'requested_by_user_id', nullable: true })
  requestedByUserId: string | null;

  @Column({
    type: 'enum',
    enum: DeliveryRunStatus,
    enumName: 'delivery_runs_status_enum',
    default: DeliveryRunStatus.PENDING,
  })
  status: DeliveryRunStatus;

  @Column({ type: 'int', name: 'attempt_limit', nullable: true })
  attemptLimit: number | null;

  @Column({ type: 'int', name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamptz', name: 'initial_job_published_at', nullable: true })
  initialJobPublishedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'dlq_published_at', nullable: true })
  dlqPublishedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'failed_at', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'dead_lettered_at', nullable: true })
  deadLetteredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** Run and Delivery use the same lifecycle values by design. */
export function deliveryStatusToRunStatus(
  status: DeliveryStatus,
): DeliveryRunStatus {
  return status as unknown as DeliveryRunStatus;
}
