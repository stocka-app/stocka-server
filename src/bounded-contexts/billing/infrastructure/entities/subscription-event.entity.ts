import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { SubscriptionEntity } from '@billing/infrastructure/entities/subscription.entity';

@Entity({ name: 'subscription_events', schema: 'billing' })
@Index('idx_sub_events_subscription_occurred', ['subscriptionId', 'occurredAt'])
@Index('idx_sub_events_tenant_occurred', ['tenantUUID', 'occurredAt'])
@Index('idx_sub_events_type_occurred', ['eventType', 'occurredAt'])
export class SubscriptionEventEntity extends BaseEntity {
  @Column({ name: 'subscription_id', type: 'int' })
  subscriptionId!: number;

  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 60 })
  eventType!: string;

  @Column({ name: 'actor_type', type: 'varchar', length: 20 })
  actorType!: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 100, nullable: true })
  actorId!: string | null;

  @Column({ name: 'related_entity_type', type: 'varchar', length: 30, nullable: true })
  relatedEntityType!: string | null;

  @Column({ name: 'related_entity_id', type: 'int', nullable: true })
  relatedEntityId!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: SubscriptionEntity;
}
