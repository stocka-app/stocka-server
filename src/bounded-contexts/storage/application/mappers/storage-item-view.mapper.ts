import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageItemView } from '@storage/domain/schemas';

/**
 * Builds the read-side view DTO from each per-type root. Used by handlers
 * that operate directly on per-type repositories so they can return a
 * normalized shape without going through any container aggregate.
 */
export const StorageItemViewMapper = {
  fromWarehouse(aggregate: WarehouseAggregate): StorageItemView {
    return {
      uuid: aggregate.uuid,
      type: StorageType.WAREHOUSE,
      name: aggregate.name.getValue(),
      description: aggregate.description?.getValue() ?? null,
      icon: aggregate.icon.getValue(),
      color: aggregate.color.getValue(),
      address: aggregate.address.getValue(),
      archivedAt: aggregate.archivedAt,
      frozenAt: aggregate.frozenAt,
      status: aggregate.status,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      roomType: null,
    };
  },

  fromStoreRoom(aggregate: StoreRoomAggregate): StorageItemView {
    return {
      uuid: aggregate.uuid,
      type: StorageType.STORE_ROOM,
      name: aggregate.name.getValue(),
      description: aggregate.description?.getValue() ?? null,
      icon: aggregate.icon.getValue(),
      color: aggregate.color.getValue(),
      address: aggregate.address?.getValue() ?? null,
      archivedAt: aggregate.archivedAt,
      frozenAt: aggregate.frozenAt,
      status: aggregate.status,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      roomType: null,
    };
  },

  fromCustomRoom(aggregate: CustomRoomAggregate): StorageItemView {
    return {
      uuid: aggregate.uuid,
      type: StorageType.CUSTOM_ROOM,
      name: aggregate.name.getValue(),
      description: aggregate.description?.getValue() ?? null,
      icon: aggregate.icon.getValue(),
      color: aggregate.color.getValue(),
      address: aggregate.address?.getValue() ?? null,
      archivedAt: aggregate.archivedAt,
      frozenAt: aggregate.frozenAt,
      status: aggregate.status,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      roomType: aggregate.roomType.getValue(),
    };
  },
} as const;
