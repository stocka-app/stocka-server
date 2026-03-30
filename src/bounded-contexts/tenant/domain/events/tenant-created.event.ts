import { DomainEvent } from '@shared/domain/base/domain-event';

export class TenantCreatedEvent extends DomainEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly ownerUserUUID: string,
    public readonly name: string,
    public readonly slug: string,
  ) {
    super();
  }
}
