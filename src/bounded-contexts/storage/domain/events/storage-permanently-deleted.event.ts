import { DomainEvent } from '@shared/domain/base/domain-event';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class StoragePermanentlyDeletedEvent extends DomainEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly storageType: StorageType,
    public readonly storageName: string,
  ) {
    super();
  }
}
