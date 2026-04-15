import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageItemView } from '@storage/domain/schemas';

/**
 * Builds the read-side view DTO from each per-type model. Used by handlers
 * that operate directly on per-type repositories (no aggregate intermediation)
 * so they can return a normalized shape without going through the aggregate.
 */
export const StorageItemViewMapper = {
  fromWarehouse(model: WarehouseModel): StorageItemView {
    return {
      uuid: model.uuid.toString(),
      type: StorageType.WAREHOUSE,
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
      address: model.address.getValue(),
      archivedAt: model.archivedAt,
      frozenAt: model.frozenAt,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      roomType: null,
    };
  },

  fromStoreRoom(model: StoreRoomModel): StorageItemView {
    return {
      uuid: model.uuid.toString(),
      type: StorageType.STORE_ROOM,
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
      address: model.address.getValue(),
      archivedAt: model.archivedAt,
      frozenAt: model.frozenAt,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      roomType: null,
    };
  },

  fromCustomRoom(model: CustomRoomModel): StorageItemView {
    return {
      uuid: model.uuid.toString(),
      type: StorageType.CUSTOM_ROOM,
      name: model.name.getValue(),
      description: model.description?.getValue() ?? null,
      icon: model.icon.getValue(),
      color: model.color.getValue(),
      address: model.address.getValue(),
      archivedAt: model.archivedAt,
      frozenAt: model.frozenAt,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      roomType: model.roomType.getValue(),
    };
  },
} as const;
