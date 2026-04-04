import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';

export class StorageMapper {
  static toDomain(
    entity: StorageEntity,
    warehouses: WarehouseModel[],
    storeRooms: StoreRoomModel[],
    customRooms: CustomRoomModel[],
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
