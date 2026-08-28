import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EventStatus {
  ACCEPTED = 'ACCEPTED',
  PUBLISHED = 'PUBLISHED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
  FAILED = 'FAILED',
}

export enum EventSource {
  CUSTOMER = 'CUSTOMER',
  ENDPOINT_TEST = 'ENDPOINT_TEST',
}

@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  @Index()
  projectId: string;

  @Column({ type: 'varchar', name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: EventSource,
    enumName: 'events_source_enum',
    default: EventSource.CUSTOMER,
  })
  source: EventSource;

  @Column({ type: 'uuid', name: 'test_target_endpoint_id', nullable: true })
  @Index()
  testTargetEndpointId: string | null;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.ACCEPTED,
  })
  status: EventStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt: Date | null;
}
