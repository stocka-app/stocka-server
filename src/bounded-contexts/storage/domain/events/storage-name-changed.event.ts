import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageNameChangedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly previousName: string,
    public readonly newName: string,
  ) {
    super();
  }
}
