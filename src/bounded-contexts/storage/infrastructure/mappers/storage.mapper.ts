import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';

export class StorageMapper {
  static toDomain(entity: StorageEntity): StorageAggregate {
    return StorageAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      tenantUUID: entity.tenantUUID,
      type: entity.type as StorageType,
      name: entity.name,
      customRoom: entity.customRoom ? CustomRoomMapper.toDomain(entity.customRoom) : null,
      storeRoom: entity.storeRoom ? StoreRoomMapper.toDomain(entity.storeRoom) : null,
      warehouse: entity.warehouse ? WarehouseMapper.toDomain(entity.warehouse) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(aggregate: StorageAggregate): Partial<StorageEntity> {
    const entity: Partial<StorageEntity> = {
      uuid: aggregate.uuid,
      tenantUUID: aggregate.tenantUUID,
      type: aggregate.type,
      name: aggregate.name,
      archivedAt: aggregate.archivedAt,
    };

    /* istanbul ignore next */
    if (aggregate.id !== undefined) {
      entity.id = aggregate.id;
    }

    if (aggregate.customRoom) {
      entity.customRoom = CustomRoomMapper.toEntity(aggregate.customRoom) as never;
    }

    if (aggregate.storeRoom) {
      entity.storeRoom = StoreRoomMapper.toEntity(aggregate.storeRoom) as never;
    }

    if (aggregate.warehouse) {
      entity.warehouse = WarehouseMapper.toEntity(aggregate.warehouse) as never;
    }

    return entity;
  }
}
