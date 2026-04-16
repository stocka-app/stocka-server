import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import {
  CreateStoreRoomProps,
  UpdateStoreRoomProps,
} from '@storage/domain/schemas/storage-operation.schema';
import type {
  StoreRoomModelAttrs,
  StoreRoomModelProps,
  StoreRoomReconstituteModelProps,
  StoreRoomTransitionProps,
} from '@storage/domain/schemas/store-room.schema';

export class StoreRoomModel {
  private readonly attrs: StoreRoomModelAttrs;

  private constructor(props: StoreRoomModelProps) {
    this.attrs = StoreRoomModel.normalizeProps(props);
  }

  static create(props: CreateStoreRoomProps): StoreRoomModel {
    const trimmedAddress =
      typeof props.address === 'string' ? props.address.trim() : props.address ?? null;
    return new StoreRoomModel({
      uuid: new UUIDVO(props.uuid),
      tenantUUID: props.tenantUUID,
      name: StorageNameVO.create(props.name),
      description: props.description ? StorageDescriptionVO.create(props.description) : null,
      icon: StorageIconVO.create(props.icon),
      color: StorageColorVO.create(props.color),
      address: trimmedAddress ? StorageAddressVO.create(trimmedAddress) : null,
    });
  }

  static reconstitute(props: StoreRoomReconstituteModelProps): StoreRoomModel {
    return new StoreRoomModel(props);
  }

  get id(): number | undefined {
    return this.attrs.id;
  }

  get uuid(): UUIDVO {
    return this.attrs.uuid;
  }

  get tenantUUID(): string {
    return this.attrs.tenantUUID;
  }

  get name(): StorageNameVO {
    return this.attrs.name;
  }

  get description(): StorageDescriptionVO | null {
    return this.attrs.description;
  }

  get icon(): StorageIconVO {
    return this.attrs.icon;
  }

  get color(): StorageColorVO {
    return this.attrs.color;
  }

  get address(): StorageAddressVO | null {
    return this.attrs.address;
  }

  get archivedAt(): Date | null {
    return this.attrs.archivedAt;
  }

  get frozenAt(): Date | null {
    return this.attrs.frozenAt;
  }

  get createdAt(): Date {
    return this.attrs.createdAt;
  }

  get updatedAt(): Date {
    return this.attrs.updatedAt;
  }

  update(props: UpdateStoreRoomProps): StoreRoomModel {
    const current = this.toProps();

    return new StoreRoomModel({
      ...current,
      name: props.name ? StorageNameVO.create(props.name) : current.name,
      description: StoreRoomModel.resolveUpdatedDescription(current.description, props.description),
      icon: props.icon ? StorageIconVO.create(props.icon) : current.icon,
      color: props.color ? StorageColorVO.create(props.color) : current.color,
      address: StoreRoomModel.resolveUpdatedAddress(current.address, props.address),
      updatedAt: new Date(),
    });
  }

  isArchived(): boolean {
    return this.archivedAt !== null;
  }

  isFrozen(): boolean {
    return this.frozenAt !== null && this.archivedAt === null;
  }

  get status(): StorageStatus {
    if (this.archivedAt !== null) return StorageStatus.ARCHIVED;
    if (this.frozenAt !== null) return StorageStatus.FROZEN;
    return StorageStatus.ACTIVE;
  }

  markArchived(): StoreRoomModel {
    return this.evolveTransition({
      archivedAt: new Date(),
      frozenAt: null,
    });
  }

  markFrozen(): StoreRoomModel {
    return this.evolveTransition({
      frozenAt: new Date(),
    });
  }

  markUnfrozen(): StoreRoomModel {
    return this.evolveTransition({
      frozenAt: null,
    });
  }

  markRestored(): StoreRoomModel {
    return this.evolveTransition({
      archivedAt: null,
      frozenAt: null,
    });
  }

  private toProps(): StoreRoomModelProps {
    return { ...this.attrs };
  }

  private static normalizeProps(props: StoreRoomModelProps): StoreRoomModelAttrs {
    return {
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      address: props.address,
      id: props.id,
      archivedAt: props.archivedAt ?? null,
      frozenAt: props.frozenAt ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  private static resolveUpdatedDescription(
    current: StorageDescriptionVO | null,
    next: string | null | undefined,
  ): StorageDescriptionVO | null {
    if (next === undefined) return current;
    if (next === null) return null;
    return StorageDescriptionVO.create(next);
  }

  /**
   * Address semantics on update:
   *   undefined → inherit current
   *   null      → clear
   *   ''        → clear (user emptied the field in the form)
   *   string    → replace
   */
  private static resolveUpdatedAddress(
    current: StorageAddressVO | null,
    next: string | null | undefined,
  ): StorageAddressVO | null {
    if (next === undefined) return current;
    if (next === null) return null;
    const trimmed = next.trim();
    if (trimmed === '') return null;
    return StorageAddressVO.create(trimmed);
  }

  private evolveTransition(props: StoreRoomTransitionProps): StoreRoomModel {
    const current = this.toProps();

    return new StoreRoomModel({
      ...current,
      archivedAt: props.archivedAt !== undefined ? props.archivedAt : current.archivedAt,
      frozenAt: props.frozenAt,
      updatedAt: props.updatedAt ?? new Date(),
    });
  }
}
