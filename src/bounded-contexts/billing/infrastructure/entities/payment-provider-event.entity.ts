import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentProviderEntity } from '@billing/infrastructure/entities/payment-provider.entity';

@Entity({ name: 'payment_provider_events', schema: 'billing' })
@Unique('uq_provider_event_external', ['providerCode', 'externalEventId'])
@Index('idx_provider_events_type_received', ['providerCode', 'eventType', 'receivedAt'])
export class PaymentProviderEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'provider_code', type: 'varchar', length: 20 })
  providerCode!: string;

  @Column({ name: 'external_event_id', type: 'varchar', length: 100 })
  externalEventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @ManyToOne(() => PaymentProviderEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'provider_code' })
  provider!: PaymentProviderEntity;
}
