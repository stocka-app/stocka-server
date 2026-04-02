import { StorageAggregate, StorageSubModel } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';

function buildSubModel(entity: StorageEntity): StorageSubModel {
  if (entity.type === StorageType.CUSTOM_ROOM) {
    if (!entity.customRoom) throw new Error(`StorageEntity ${entity.uuid} missing customRoom`);
    return { type: StorageType.CUSTOM_ROOM, model: CustomRoomMapper.toDomain(entity.customRoom) };
  }
  if (entity.type === StorageType.STORE_ROOM) {
    if (!entity.storeRoom) throw new Error(`StorageEntity ${entity.uuid} missing storeRoom`);
    return { type: StorageType.STORE_ROOM, model: StoreRoomMapper.toDomain(entity.storeRoom) };
  }
  if (!entity.warehouse) throw new Error(`StorageEntity ${entity.uuid} missing warehouse`);
  return { type: StorageType.WAREHOUSE, model: WarehouseMapper.toDomain(entity.warehouse) };
}

function resolveLifecycle(entity: StorageEntity): {
  frozenAt: Date | null;
  archivedAt: Date | null;
} {
  const sub = entity.customRoom ?? entity.storeRoom ?? entity.warehouse;
  /* istanbul ignore next — buildSubModel always throws first when sub-entities are absent */
  if (!sub) throw new Error(`StorageEntity ${entity.uuid} has no sub-entity`);
  return { frozenAt: sub.frozenAt, archivedAt: sub.archivedAt };
}

export class StorageMapper {
  static toDomain(entity: StorageEntity): StorageAggregate {
    const sub = buildSubModel(entity);
    const { frozenAt, archivedAt } = resolveLifecycle(entity);

    return StorageAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      tenantUUID: entity.tenantUUID,
      parentUUID: entity.parentUUID,
      sub,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt,
      frozenAt,
    });
  }

  static toEntity(aggregate: StorageAggregate): Partial<StorageEntity> {
    const entity: Partial<StorageEntity> = {
      uuid: aggregate.uuid,
      tenantUUID: aggregate.tenantUUID,
      type: aggregate.type,
      parentUUID: aggregate.parentUUID,
    };

    /* istanbul ignore next */
    if (aggregate.id !== undefined) {
      entity.id = aggregate.id;
    }

    const lifecycleFields = { frozenAt: aggregate.frozenAt, archivedAt: aggregate.archivedAt };
    const { type, model } = aggregate.sub;

    if (type === StorageType.CUSTOM_ROOM) {
      entity.customRoom = { ...CustomRoomMapper.toEntity(model), ...lifecycleFields } as never;
    } else if (type === StorageType.STORE_ROOM) {
      entity.storeRoom = { ...StoreRoomMapper.toEntity(model), ...lifecycleFields } as never;
    } else {
      entity.warehouse = { ...WarehouseMapper.toEntity(model), ...lifecycleFields } as never;
    }

    return entity;
  }
}
