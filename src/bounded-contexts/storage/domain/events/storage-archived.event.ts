import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageArchivedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
  ) {
    super();
  }
}
