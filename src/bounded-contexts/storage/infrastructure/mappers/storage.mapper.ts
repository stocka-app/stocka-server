import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';

export class StorageMapper {
  static toDomain(
    entity: StorageEntity,
    warehouses: WarehouseAggregate[],
    storeRooms: StoreRoomAggregate[],
    customRooms: CustomRoomAggregate[],
  ): StorageAggregate {
    return StorageAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      tenantUUID: entity.tenantUUID,
      warehouses,
      storeRooms,
      customRooms,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
