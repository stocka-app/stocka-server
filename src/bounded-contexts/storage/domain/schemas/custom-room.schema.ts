import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';

export interface CustomRoomModelProps {
  uuid: UUIDVO;
  tenantUUID: string;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  roomType: RoomTypeNameVO;
  address: StorageAddressVO;

  // Persistence-managed fields: optional on input, normalized in attrs.
  id?: number;
  archivedAt?: Date | null;
  frozenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomRoomModelAttrs {
  uuid: UUIDVO;
  tenantUUID: string;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  roomType: RoomTypeNameVO;
  address: StorageAddressVO;

  id?: number;
  archivedAt: Date | null;
  frozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomRoomCreateModelProps = Omit<
  CustomRoomModelProps,
  'id' | 'archivedAt' | 'frozenAt' | 'createdAt' | 'updatedAt'
>;

export type CustomRoomUpdateModelProps = Partial<
  Pick<CustomRoomModelAttrs, 'name' | 'description' | 'icon' | 'color' | 'roomType' | 'address'>
>;

export type CustomRoomArchiveModelProps = Pick<CustomRoomModelAttrs, 'archivedAt'>;

export type CustomRoomFreezeModelProps = Pick<CustomRoomModelAttrs, 'frozenAt'>;

export type CustomRoomReconstituteModelProps = CustomRoomModelProps & {
  archivedAt: Date | null;
  frozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomRoomTransitionProps = {
  archivedAt?: Date | null;
  frozenAt: Date | null;
  updatedAt?: Date;
};
