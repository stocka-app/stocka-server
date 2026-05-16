import { SubscriptionAggregate } from '@billing/domain/aggregates/subscription.aggregate';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

/**
 * Repository contract for `SubscriptionAggregate`. One subscription per
 * tenant (UNIQUE constraint on `tenant_uuid`). Implementations live in
 * `billing/infrastructure/persistence/repositories/`.
 */
export interface ISubscriptionRepository {
  /** Upserts the aggregate (insert on missing id, update otherwise). */
  save(aggregate: SubscriptionAggregate): Promise<SubscriptionAggregate>;

  findByUUID(uuid: string): Promise<SubscriptionAggregate | null>;

  /**
   * Primary lookup for almost every flow — handlers receive a tenantUUID
   * from the JWT and load the sub from there.
   */
  findByTenantUUID(tenantUUID: string): Promise<SubscriptionAggregate | null>;

  /** Reverse lookup from a Stripe customer.id (webhook handlers). */
  findByExternalCustomerId(
    provider: PaymentProviderCodeVO,
    customerId: string,
  ): Promise<SubscriptionAggregate | null>;

  /** Reverse lookup from a Stripe subscription.id (webhook handlers). */
  findByExternalSubscriptionId(
    provider: PaymentProviderCodeVO,
    subscriptionId: string,
  ): Promise<SubscriptionAggregate | null>;

  /**
   * Subs in dunning GRACE whose `gracePeriodEndsAt` passed more than
   * `threshold` time ago — for the dunning safety-net cron to rescue
   * webhooks that never arrived. The handler should pass
   * `threshold = now - 24h` so the webhook (primary trigger) gets a fair
   * window to fire first.
   */
  findStuckInDunningGrace(threshold: Date, limit: number): Promise<SubscriptionAggregate[]>;
}
