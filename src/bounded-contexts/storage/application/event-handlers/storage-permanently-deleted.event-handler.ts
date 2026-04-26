import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IStorageActivityLogRepository } from '@storage/domain/contracts/storage-activity-log.repository.contract';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StoragePermanentlyDeletedEvent } from '@storage/domain/events/storage-permanently-deleted.event';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';

@Injectable()
@EventsHandler(StoragePermanentlyDeletedEvent)
export class StoragePermanentlyDeletedEventHandler implements IEventHandler<StoragePermanentlyDeletedEvent> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_ACTIVITY_LOG_CONTRACT)
    private readonly activityLogRepository: IStorageActivityLogRepository,
  ) {}

  async handle(event: StoragePermanentlyDeletedEvent): Promise<void> {
    const entry = StorageActivityLogEntry.create({
      storageUUID: event.storageUUID,
      tenantUUID: event.tenantUUID,
      actorUUID: event.actorUUID,
      action: StorageActivityAction.DELETED,
      previousValue: { storageName: event.storageName, storageType: event.storageType },
      newValue: null,
    });

    await this.activityLogRepository.save(entry);
  }
}
