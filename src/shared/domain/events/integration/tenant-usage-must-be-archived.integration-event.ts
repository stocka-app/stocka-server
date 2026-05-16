import { DomainEvent } from '@shared/domain/base/domain-event';

/**
 * Integration event: Billing BC → Storage BC + User BC.
 *
 * Published by Billing when a TierChangeAggregate reaches the day-15
 * auto-archive milestone (TierChangeAutoArchivedEvent in-BC). Cross-BC
 * consumers archive the tenant's excess entities (warehouses, members)
 * down to the new tier's limits — soft-archive, recoverable until the
 * day-90 hard-delete event fires.
 *
 * Consumers:
 *   - Storage BC: `archiveExcessWarehouses(tenantUUID, targetTier)`
 *   - User BC:    `archiveExcessMembers(tenantUUID, targetTier)`
 *
 * Each consumer returns its archive snapshot via mediator, which the
 * Billing event handler stitches into `tierChange.markArchived(snapshot)`.
 * The snapshot is what gets hard-deleted at day 90.
 */
export class TenantUsageMustBeArchivedIntegrationEvent extends DomainEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly tierChangeUUID: string,
    public readonly targetTier: string,
  ) {
    super();
  }
}
