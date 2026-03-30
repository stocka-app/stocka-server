import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageUpdatedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
  ) {
    super();
  }
}
