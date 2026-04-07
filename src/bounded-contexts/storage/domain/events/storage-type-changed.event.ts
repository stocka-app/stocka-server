import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageTypeChangedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly previousValue: string,
    public readonly newValue: string,
  ) {
    super();
  }
}
