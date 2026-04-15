import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageRestoredEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
  ) {
    super();
  }
}
