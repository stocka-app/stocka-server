import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';

export class StorageActivityLogMapper {
  static toDomain(entity: StorageActivityLogEntity): StorageActivityLogEntry {
    return StorageActivityLogEntry.reconstitute({
      id: entity.id,
      uuid: new UUIDVO(entity.uuid),
      storageUUID: new UUIDVO(entity.storageUUID),
      tenantUUID: new UUIDVO(entity.tenantUUID),
      actorUUID: new UUIDVO(entity.actorUUID),
      action: entity.action as StorageActivityAction,
      previousValue: entity.previousValue,
      newValue: entity.newValue,
      occurredAt: entity.occurredAt,
    });
  }

  static toEntity(entry: StorageActivityLogEntry): StorageActivityLogEntity {
    const entity = new StorageActivityLogEntity();
    if (entry.id !== undefined) {
      entity.id = entry.id;
    }
    entity.uuid = entry.uuid.toString();
    entity.storageUUID = entry.storageUUID.toString();
    entity.tenantUUID = entry.tenantUUID.toString();
    entity.actorUUID = entry.actorUUID.toString();
    entity.action = entry.action;
    entity.previousValue = entry.previousValue;
    entity.newValue = entry.newValue;
    entity.occurredAt = entry.occurredAt;
    return entity;
  }
}
