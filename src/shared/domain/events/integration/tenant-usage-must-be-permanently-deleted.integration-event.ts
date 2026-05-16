import { DomainEvent } from '@shared/domain/base/domain-event';

/**
 * Integration event: Billing BC → Storage BC + User BC.
 *
 * Published by Billing when a TierChangeAggregate reaches the day-90
 * deletion milestone (TierChangeDeletedEvent in-BC). Cross-BC consumers
 * hard-delete the entities listed in `snapshot` — irrecoverable.
 *
 * `snapshot` is the structured map captured at day-15 archive time
 * (see TenantUsageMustBeArchivedIntegrationEvent). It tells each BC
 * exactly which entities (by uuid) were soft-archived under this
 * TierChange and now need permanent removal.
 *
 * Consumers:
 *   - Storage BC: hard-delete the warehouses in `snapshot.warehouses[]`
 *   - User BC:    hard-delete the members in `snapshot.members[]`
 *
 * Critical: handlers must verify each entity is STILL archived under
 * THIS TierChange before deleting (snapshot may be 75 days old; a user
 * could have restored individual items via support before day 90 and
 * those should be preserved).
 */
export class TenantUsageMustBePermanentlyDeletedIntegrationEvent extends DomainEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly tierChangeUUID: string,
    public readonly snapshot: Record<string, unknown>,
  ) {
    super();
  }
}
