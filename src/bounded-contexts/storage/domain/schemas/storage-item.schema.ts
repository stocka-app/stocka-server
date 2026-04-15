import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export interface StorageItemView {
  uuid: string;
  type: StorageType;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  address: string | null;
  archivedAt: Date | null;
  frozenAt: Date | null;
  status: StorageStatus;
  createdAt: Date;
  updatedAt: Date;
  roomType: string | null;
}

export interface StorageStatusSummary {
  active: number;
  frozen: number;
  archived: number;
}

export interface StorageTypeSummary {
  WAREHOUSE: StorageStatusSummary;
  STORE_ROOM: StorageStatusSummary;
  CUSTOM_ROOM: StorageStatusSummary;
}

export interface StorageItemPage {
  items: StorageItemView[];
  total: number;
  summary: StorageStatusSummary;
  typeSummary: StorageTypeSummary;
}
