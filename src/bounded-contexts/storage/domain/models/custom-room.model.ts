import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import type {
  CreateCustomRoomProps,
  UpdateCustomRoomProps,
} from '@storage/domain/schemas/storage-operation.schema';
import type {
  CustomRoomModelAttrs,
  CustomRoomModelProps,
  CustomRoomReconstituteModelProps,
  CustomRoomTransitionProps,
} from '@storage/domain/schemas/custom-room.schema';

export class CustomRoomModel {
  private readonly attrs: CustomRoomModelAttrs;

  private constructor(props: CustomRoomModelProps) {
    this.attrs = CustomRoomModel.normalizeProps(props);
  }

  static create(props: CreateCustomRoomProps): CustomRoomModel {
    return new CustomRoomModel({
      uuid: new UUIDVO(props.uuid),
      tenantUUID: props.tenantUUID,
      name: StorageNameVO.create(props.name),
      description: props.description ? StorageDescriptionVO.create(props.description) : null,
      icon: StorageIconVO.create(props.icon),
      color: StorageColorVO.create(props.color),
      roomType: RoomTypeNameVO.create(props.roomType),
      address: StorageAddressVO.create(props.address),
    });
  }

  static reconstitute(props: CustomRoomReconstituteModelProps): CustomRoomModel {
    return new CustomRoomModel(props);
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

  get roomType(): RoomTypeNameVO {
    return this.attrs.roomType;
  }

  get address(): StorageAddressVO {
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

  update(props: UpdateCustomRoomProps): CustomRoomModel {
    const current = this.toProps();
    const nextUpdatedAt = new Date();
    const name = props.name !== undefined ? StorageNameVO.create(props.name) : current.name;
    const icon = props.icon !== undefined ? StorageIconVO.create(props.icon) : current.icon;
    const color = props.color !== undefined ? StorageColorVO.create(props.color) : current.color;
    const roomType =
      props.roomType !== undefined ? RoomTypeNameVO.create(props.roomType) : current.roomType;
    const address =
      props.address !== undefined ? StorageAddressVO.create(props.address) : current.address;
    const description = CustomRoomModel.resolveUpdatedDescription(
      current.description,
      props.description,
    );

    return new CustomRoomModel({
      ...current,
      name,
      description,
      icon,
      color,
      roomType,
      address,
      updatedAt: nextUpdatedAt,
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

  markArchived(): CustomRoomModel {
    return this.evolveTransition({
      archivedAt: new Date(),
      frozenAt: this.frozenAt,
    });
  }

  markFrozen(): CustomRoomModel {
    return this.evolveTransition({
      frozenAt: new Date(),
    });
  }

  markUnfrozen(): CustomRoomModel {
    return this.evolveTransition({
      frozenAt: null,
    });
  }

  private toProps(): CustomRoomModelProps {
    return { ...this.attrs };
  }

  private static normalizeProps(props: CustomRoomModelProps): CustomRoomModelAttrs {
    return {
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      roomType: props.roomType,
      address: props.address,
      id: props.id,
      archivedAt: props.archivedAt ?? null,
      frozenAt: props.frozenAt ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  private evolveTransition(props: CustomRoomTransitionProps): CustomRoomModel {
    const current = this.toProps();

    return new CustomRoomModel({
      ...current,
      archivedAt: props.archivedAt !== undefined ? props.archivedAt : current.archivedAt,
      frozenAt: props.frozenAt,
      updatedAt: props.updatedAt ?? new Date(),
    });
  }

  private static resolveUpdatedDescription(
    current: StorageDescriptionVO | null,
    next: string | null | undefined,
  ): StorageDescriptionVO | null {
    if (next === undefined) return current;
    if (next === null) return null;
    return StorageDescriptionVO.create(next);
  }
}
