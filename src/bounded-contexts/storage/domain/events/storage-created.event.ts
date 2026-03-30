import { DomainEvent } from '@shared/domain/base/domain-event';

export class StorageCreatedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly type: string,
    public readonly name: string,
  ) {
    super();
  }
}
