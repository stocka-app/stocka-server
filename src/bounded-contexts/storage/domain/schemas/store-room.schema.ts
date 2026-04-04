import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';

export interface StoreRoomModelProps {
  uuid: UUIDVO;
  tenantUUID: string;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  address: StorageAddressVO;

  id?: number;
  archivedAt?: Date | null;
  frozenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StoreRoomModelAttrs {
  uuid: UUIDVO;
  tenantUUID: string;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  address: StorageAddressVO;

  id?: number;
  archivedAt: Date | null;
  frozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type StoreRoomReconstituteModelProps = StoreRoomModelProps & {
  archivedAt: Date | null;
  frozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoreRoomTransitionProps = {
  archivedAt?: Date | null;
  frozenAt: Date | null;
  updatedAt?: Date;
};
