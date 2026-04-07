import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageDescriptionChangedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly previousValue: string | null,
    public readonly newValue: string | null,
  ) {
    super();
  }
}
