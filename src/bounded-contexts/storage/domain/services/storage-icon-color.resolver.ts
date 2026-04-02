import { StorageType } from '@storage/domain/enums/storage-type.enum';

export const WAREHOUSE_DEFAULT_ICON = 'warehouse';
export const WAREHOUSE_DEFAULT_COLOR = '#3b82f6';

export const STORE_ROOM_DEFAULT_ICON = 'inventory_2';
export const STORE_ROOM_DEFAULT_COLOR = '#d97706';

export const CUSTOM_ROOM_DEFAULT_ICON = 'other_houses';
export const CUSTOM_ROOM_DEFAULT_COLOR = '#6B7280';

export function resolveStorageIcon(type: StorageType, icon?: string): string {
  switch (type) {
    case StorageType.WAREHOUSE:
      return WAREHOUSE_DEFAULT_ICON;
    case StorageType.STORE_ROOM:
      return STORE_ROOM_DEFAULT_ICON;
    case StorageType.CUSTOM_ROOM:
      return icon ?? CUSTOM_ROOM_DEFAULT_ICON;
  }
}

export function resolveStorageColor(type: StorageType, color?: string): string {
  switch (type) {
    case StorageType.WAREHOUSE:
      return WAREHOUSE_DEFAULT_COLOR;
    case StorageType.STORE_ROOM:
      return STORE_ROOM_DEFAULT_COLOR;
    case StorageType.CUSTOM_ROOM:
      return color ?? CUSTOM_ROOM_DEFAULT_COLOR;
  }
}
