import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import {
  CreateWarehouseProps,
  UpdateWarehouseProps,
} from '@storage/domain/schemas/storage-operation.schema';
import type {
  WarehouseModelAttrs,
  WarehouseModelProps,
  WarehouseReconstituteModelProps,
  WarehouseTransitionProps,
} from '@storage/domain/schemas/warehouse.schema';

export class WarehouseModel {
  private readonly attrs: WarehouseModelAttrs;

  private constructor(props: WarehouseModelProps) {
    this.attrs = WarehouseModel.normalizeProps(props);
  }

  static create(props: CreateWarehouseProps): WarehouseModel {
    return new WarehouseModel({
      uuid: new UUIDVO(props.uuid),
      tenantUUID: props.tenantUUID,
      name: StorageNameVO.create(props.name),
      description: props.description ? StorageDescriptionVO.create(props.description) : null,
      icon: StorageIconVO.create(props.icon),
      color: StorageColorVO.create(props.color),
      address: StorageAddressVO.create(props.address),
    });
  }

  static reconstitute(props: WarehouseReconstituteModelProps): WarehouseModel {
    return new WarehouseModel(props);
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

  update(props: UpdateWarehouseProps): WarehouseModel {
    const current = this.toProps();

    return new WarehouseModel({
      ...current,
      name: props.name !== undefined ? StorageNameVO.create(props.name) : current.name,
      description: WarehouseModel.resolveUpdatedDescription(current.description, props.description),
      icon: props.icon !== undefined ? StorageIconVO.create(props.icon) : current.icon,
      color: props.color !== undefined ? StorageColorVO.create(props.color) : current.color,
      address:
        props.address !== undefined ? StorageAddressVO.create(props.address) : current.address,
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

  markArchived(): WarehouseModel {
    return this.evolveTransition({
      archivedAt: new Date(),
      frozenAt: this.frozenAt,
    });
  }

  markFrozen(): WarehouseModel {
    return this.evolveTransition({
      frozenAt: new Date(),
    });
  }

  markUnfrozen(): WarehouseModel {
    return this.evolveTransition({
      frozenAt: null,
    });
  }

  private toProps(): WarehouseModelProps {
    return { ...this.attrs };
  }

  private static normalizeProps(props: WarehouseModelProps): WarehouseModelAttrs {
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

  private evolveTransition(props: WarehouseTransitionProps): WarehouseModel {
    const current = this.toProps();

    return new WarehouseModel({
      ...current,
      archivedAt: props.archivedAt !== undefined ? props.archivedAt : current.archivedAt,
      frozenAt: props.frozenAt,
      updatedAt: props.updatedAt ?? new Date(),
    });
  }
}
