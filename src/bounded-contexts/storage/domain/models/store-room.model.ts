import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';

export interface StoreRoomModelCreateProps {
  uuid: string;
  tenantUUID: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  address?: string | null;
}

export interface StoreRoomModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  tenantUUID: UUIDVO;
  name: StorageNameVO;
  description: StorageDescriptionVO | null;
  icon: StorageIconVO;
  color: StorageColorVO;
  address: StorageAddressVO | null;
  frozenAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreRoomModelChanges {
  name?: StorageNameVO;
  description?: StorageDescriptionVO | null;
  icon?: StorageIconVO;
  color?: StorageColorVO;
  address?: StorageAddressVO | null;
  frozenAt?: Date | null;
  archivedAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Pure data carrier for a StoreRoom — immutable snapshot. No business
 * operations live here; every transition + invariant is the
 * responsibility of `StoreRoomAggregate`. Address is optional
 * (`StorageAddressVO | null`) — store rooms can omit a physical address.
 */
export class StoreRoomModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly tenantUUID: UUIDVO,
    public readonly name: StorageNameVO,
    public readonly description: StorageDescriptionVO | null,
    public readonly icon: StorageIconVO,
    public readonly color: StorageColorVO,
    public readonly address: StorageAddressVO | null,
    public readonly frozenAt: Date | null,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static create(props: StoreRoomModelCreateProps): StoreRoomModel {
    const trimmedAddress =
      typeof props.address === 'string' ? props.address.trim() : (props.address ?? null);
    const now = new Date();
    return new StoreRoomModel(
      new UUIDVO(props.uuid),
      new UUIDVO(props.tenantUUID),
      StorageNameVO.create(props.name),
      props.description ? StorageDescriptionVO.create(props.description) : null,
      StorageIconVO.create(props.icon),
      StorageColorVO.create(props.color),
      trimmedAddress ? StorageAddressVO.create(trimmedAddress) : null,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: StoreRoomModelReconstituteProps): StoreRoomModel {
    return new StoreRoomModel(
      props.uuid,
      props.tenantUUID,
      props.name,
      props.description,
      props.icon,
      props.color,
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

  with(changes: StoreRoomModelChanges): StoreRoomModel {
    return new StoreRoomModel(
      this.uuid,
      this.tenantUUID,
      changes.name ?? this.name,
      changes.description !== undefined ? changes.description : this.description,
      changes.icon ?? this.icon,
      changes.color ?? this.color,
      changes.address !== undefined ? changes.address : this.address,
      changes.frozenAt !== undefined ? changes.frozenAt : this.frozenAt,
      changes.archivedAt !== undefined ? changes.archivedAt : this.archivedAt,
      this.createdAt,
      changes.updatedAt ?? new Date(),
      this.id,
    );
  }
}
