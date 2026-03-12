import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('process_state')
export class ProcessStateEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'process_name', length: 100 })
  @Index('IDX_process_state_process_name')
  processName!: string;

  @Column({ name: 'correlation_id', length: 255 })
  @Index('IDX_process_state_correlation_id', { unique: true })
  correlationId!: string;

  @Column({ length: 20, default: 'started' })
  @Index('IDX_process_state_status')
  status!: string;

  @Column({ name: 'current_step', length: 100 })
  currentStep!: string;

  @Column({ type: 'jsonb', default: '{}' })
  data!: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
