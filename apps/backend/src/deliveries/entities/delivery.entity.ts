import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

@Entity({ name: 'deliveries' })
@Index(['eventId', 'endpointId'], { unique: true })
export class DeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'event_id' })
  eventId: string;

  @Column({ type: 'uuid', name: 'endpoint_id' })
  endpointId: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ type: 'int', name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'failed_at', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'int', name: 'http_status_code', nullable: true })
  httpStatusCode: number | null;

  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
