import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';

export interface CustomRoomModelCreateProps {
  uuid: string;
  tenantUUID: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  roomType: string;
  address?: string | null;
}

export interface CustomRoomModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  tenantUUID: UUIDVO;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  roomType: RoomTypeNameVO;
  address: StorageAddressVO | null;
  frozenAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomRoomModelChanges {
  name?: StorageNameVO;
  description?: StorageDescriptionVO | null;
  icon?: StorageIconVO;
  color?: StorageColorVO;
  roomType?: RoomTypeNameVO;
  address?: StorageAddressVO | null;
  frozenAt?: Date | null;
  archivedAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Pure data carrier for a CustomRoom — immutable snapshot. Same shape as
 * StoreRoom plus an additional `roomType: RoomTypeNameVO` (a free-text
 * label like "kitchen", "office", or any tenant-defined category).
 * Address is optional. No business operations live here — `CustomRoomAggregate`
 * is the operator.
 */
export class CustomRoomModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly tenantUUID: UUIDVO,
    public readonly name: StorageNameVO,
    public readonly description: StorageDescriptionVO | null,
    public readonly icon: StorageIconVO,
    public readonly color: StorageColorVO,
    public readonly roomType: RoomTypeNameVO,
    public readonly address: StorageAddressVO | null,
    public readonly frozenAt: Date | null,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static create(props: CustomRoomModelCreateProps): CustomRoomModel {
    const trimmedAddress =
      typeof props.address === 'string' ? props.address.trim() : (props.address ?? null);
    const now = new Date();
    return new CustomRoomModel(
      new UUIDVO(props.uuid),
      new UUIDVO(props.tenantUUID),
      StorageNameVO.create(props.name),
      props.description ? StorageDescriptionVO.create(props.description) : null,
      StorageIconVO.create(props.icon),
      StorageColorVO.create(props.color),
      RoomTypeNameVO.create(props.roomType),
      trimmedAddress ? StorageAddressVO.create(trimmedAddress) : null,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: CustomRoomModelReconstituteProps): CustomRoomModel {
    return new CustomRoomModel(
      props.uuid,
      props.tenantUUID,
      props.name,
      props.description,
      props.icon,
      props.color,
      props.roomType,
      props.address,
      props.frozenAt,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }

  isFrozen(): boolean {
    return this.frozenAt !== null && this.archivedAt === null;
  }

  get status(): StorageStatus {
    if (this.archivedAt !== null) return StorageStatus.ARCHIVED;
    if (this.frozenAt !== null) return StorageStatus.FROZEN;
    return StorageStatus.ACTIVE;
  }

  with(changes: CustomRoomModelChanges): CustomRoomModel {
    return new CustomRoomModel(
      this.uuid,
      this.tenantUUID,
      changes.name ?? this.name,
      changes.description !== undefined ? changes.description : this.description,
      changes.icon ?? this.icon,
      changes.color ?? this.color,
      changes.roomType ?? this.roomType,
      changes.address !== undefined ? changes.address : this.address,
      changes.frozenAt !== undefined ? changes.frozenAt : this.frozenAt,
      changes.archivedAt !== undefined ? changes.archivedAt : this.archivedAt,
      this.createdAt,
      changes.updatedAt ?? new Date(),
      this.id,
    );
  }
}
