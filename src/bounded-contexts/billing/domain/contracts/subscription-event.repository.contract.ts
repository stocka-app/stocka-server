import { SubscriptionEventModel } from '@billing/domain/models/subscription-event.model';

export interface SubscriptionEventPagination {
  limit: number;
  offset: number;
}

/**
 * Append-only audit log of billing events tied to a subscription —
 * populated by the in-BC event handler that listens to domain events
 * emitted by the three billing aggregates and persists a structured
 * trail for support, ops, and compliance.
 *
 * Read operations are paginated; once inserted, rows are never updated
 * (no `update` / `delete` methods).
 */
export interface ISubscriptionEventRepository {
  insert(event: SubscriptionEventModel): Promise<void>;

  findBySubscription(
    subscriptionId: number,
    pagination: SubscriptionEventPagination,
  ): Promise<SubscriptionEventModel[]>;

  findByTenant(
    tenantUUID: string,
    pagination: SubscriptionEventPagination,
  ): Promise<SubscriptionEventModel[]>;
}
