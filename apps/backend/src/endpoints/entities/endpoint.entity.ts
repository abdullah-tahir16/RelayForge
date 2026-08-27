import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'endpoints' })
export class EndpointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  @Index()
  projectId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', name: 'timeout_ms', default: 10000 })
  timeoutMs: number;

  @Column({
    type: 'text',
    name: 'signing_secret_encrypted',
    select: false,
  })
  signingSecretEncrypted: string;

  @Column({
    type: 'char',
    length: 64,
    name: 'signing_secret_hash',
    select: false,
  })
  signingSecretHash: string;

  @Column({ type: 'int', name: 'signing_secret_version', default: 1 })
  signingSecretVersion: number;

  @Column({ type: 'timestamptz', name: 'signing_secret_rotated_at' })
  signingSecretRotatedAt: Date;

  @Column({ type: 'timestamptz', name: 'disabled_at', nullable: true })
  disabledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
