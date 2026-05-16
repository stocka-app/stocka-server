import { v7 as uuidV7 } from 'uuid';
import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { SubscriptionEventActorTypeVO } from '@billing/domain/value-objects/subscription-event-actor-type.vo';
import { SubscriptionEventTypeVO } from '@billing/domain/value-objects/subscription-event-type.vo';

export interface SubscriptionEventModelCreateProps {
  subscriptionId: number;
  tenantUUID: string;
  eventType: SubscriptionEventTypeVO;
  actorType: SubscriptionEventActorTypeVO;
  actorId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  description?: string | null;
  payload?: Record<string, unknown> | null;
  occurredAt?: Date;
}

export interface SubscriptionEventModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  subscriptionId: number;
  tenantUUID: UUIDVO;
  eventType: SubscriptionEventTypeVO;
  actorType: SubscriptionEventActorTypeVO;
  actorId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  description: string | null;
  payload: Record<string, unknown> | null;
  occurredAt: Date;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pure data carrier for a `billing.subscription_events` row. Append-only by
 * design: there is **no `with()` method** — once an event is recorded it is
 * never updated. Audit log integrity depends on this immutability.
 *
 * Created by an in-BC event handler that listens to domain events emitted by
 * the three billing aggregates (Subscription / TierChange / Invoice) and
 * persists a structured trail for support, ops, and compliance queries.
 */
export class SubscriptionEventModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly subscriptionId: number,
    public readonly tenantUUID: UUIDVO,
    public readonly eventType: SubscriptionEventTypeVO,
    public readonly actorType: SubscriptionEventActorTypeVO,
    public readonly actorId: string | null,
    public readonly relatedEntityType: string | null,
    public readonly relatedEntityId: number | null,
    public readonly description: string | null,
    public readonly payload: Record<string, unknown> | null,
    public readonly occurredAt: Date,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static create(props: SubscriptionEventModelCreateProps): SubscriptionEventModel {
    const now = new Date();
    return new SubscriptionEventModel(
      new UUIDVO(uuidV7()),
      props.subscriptionId,
      new UUIDVO(props.tenantUUID),
      props.eventType,
      props.actorType,
      props.actorId ?? null,
      props.relatedEntityType ?? null,
      props.relatedEntityId ?? null,
      props.description ?? null,
      props.payload ?? null,
      props.occurredAt ?? now,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: SubscriptionEventModelReconstituteProps): SubscriptionEventModel {
    return new SubscriptionEventModel(
      props.uuid,
      props.subscriptionId,
      props.tenantUUID,
      props.eventType,
      props.actorType,
      props.actorId,
      props.relatedEntityType,
      props.relatedEntityId,
      props.description,
      props.payload,
      props.occurredAt,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }
}
