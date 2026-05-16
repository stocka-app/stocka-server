import { DomainEvent } from '@shared/domain/base/domain-event';

/**
 * Integration event: Billing BC → Tenant BC.
 *
 * Published by Billing whenever a tenant's billing tier effectively
 * changes — i.e. the source-of-truth columns on `billing.subscriptions`
 * have been updated. Fires after:
 *   - UpgradeCommittedEvent (Stripe Checkout confirmed)
 *   - DowngradeAppliedEvent (cold-down expired, cron applied)
 *   - EnterprisePlanAssignedEvent (admin assigned ENTERPRISE)
 *   - SubscriptionResetToFreeEvent (cancellation or contract end)
 *   - DunningDowngradeExecutedEvent (forced downgrade after dunning)
 *
 * Tenant BC subscribes and mirrors `newTier` into `TenantConfigModel.tier`
 * — the FE reads tier from Tenant, not from Billing, so the two must
 * stay synchronized. The handler invokes `tenant.changeTier(...)`
 * via mediator (idempotent).
 */
export class TenantTierChangedIntegrationEvent extends DomainEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly previousTier: string,
    public readonly newTier: string,
    public readonly source:
      | 'UPGRADE_COMMITTED'
      | 'DOWNGRADE_APPLIED'
      | 'ENTERPRISE_ASSIGNED'
      | 'RESET_TO_FREE'
      | 'DUNNING_DOWNGRADE',
    public readonly actorUUID: string,
  ) {
    super();
  }
}
