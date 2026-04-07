import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { StorageIconChangedEvent } from '@storage/domain/events/storage-icon-changed.event';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { IStorageActivityLogRepository } from '@storage/domain/contracts/storage-activity-log.repository.contract';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
@EventsHandler(StorageIconChangedEvent)
export class StorageIconChangedEventHandler implements IEventHandler<StorageIconChangedEvent> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_ACTIVITY_LOG_CONTRACT)
    private readonly activityLogRepository: IStorageActivityLogRepository,
  ) {}

  async handle(event: StorageIconChangedEvent): Promise<void> {
    const entry = StorageActivityLogEntry.create({
      storageUUID: event.storageUUID,
      tenantUUID: event.tenantUUID,
      actorUUID: event.actorUUID,
      action: StorageActivityAction.ICON_CHANGED,
      previousValue: { icon: event.previousValue },
      newValue: { icon: event.newValue },
    });

    await this.activityLogRepository.save(entry);
  }
}
