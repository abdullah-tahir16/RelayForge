import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'subscriptions' })
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'endpoint_id' })
  @Index()
  endpointId: string;

  @Column({ type: 'varchar', name: 'event_pattern' })
  eventPattern: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
