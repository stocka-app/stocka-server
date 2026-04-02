import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageUpdatedEvent } from '@storage/domain/events/storage-updated.event';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { v7 as uuidV7 } from 'uuid';

export type StorageSubModel =
  | { type: StorageType.CUSTOM_ROOM; model: CustomRoomModel }
  | { type: StorageType.STORE_ROOM; model: StoreRoomModel }
  | { type: StorageType.WAREHOUSE; model: WarehouseModel };

export interface StorageAggregateReconstituteProps extends AggregateRootProps {
  id: number;
  uuid: string;
  tenantUUID: string;
  parentUUID: string | null;
  sub: StorageSubModel;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  frozenAt: Date | null;
}

export class StorageAggregate extends AggregateRoot {
  private readonly _tenantUUID: string;
  private readonly _parentUUID: string | null;
  private _sub: StorageSubModel;
  private _frozenAt: Date | null;

  private constructor(
    props: AggregateRootProps & {
      tenantUUID: string;
      parentUUID: string | null;
      sub: StorageSubModel;
      frozenAt?: Date | null;
    },
  ) {
    super(props);
    this._tenantUUID = props.tenantUUID;
    this._parentUUID = props.parentUUID;
    this._sub = props.sub;
    this._frozenAt = props.frozenAt ?? null;
  }

  static createCustomRoom(props: {
    tenantUUID: string;
    name: string;
    roomType: string;
    icon: string;
    color: string;
    address: string;
    description?: string;
    parentUUID?: string;
  }): StorageAggregate {
    const storageUUID = uuidV7();

    const model = CustomRoomModel.create({
      uuid: uuidV7(),
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      roomType: props.roomType,
      address: props.address,
    });

    const aggregate = new StorageAggregate({
      uuid: storageUUID,
      tenantUUID: props.tenantUUID,
      parentUUID: props.parentUUID ?? null,
      sub: { type: StorageType.CUSTOM_ROOM, model },
    });

    aggregate.apply(
      new StorageCreatedEvent(storageUUID, props.tenantUUID, StorageType.CUSTOM_ROOM, props.name),
    );

    return aggregate;
  }

  static createStoreRoom(props: {
    tenantUUID: string;
    name: string;
    icon: string;
    color: string;
    address: string;
    description?: string;
    parentUUID?: string;
  }): StorageAggregate {
    const storageUUID = uuidV7();

    const model = StoreRoomModel.create({
      uuid: uuidV7(),
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      address: props.address,
    });

    const aggregate = new StorageAggregate({
      uuid: storageUUID,
      tenantUUID: props.tenantUUID,
      parentUUID: props.parentUUID ?? null,
      sub: { type: StorageType.STORE_ROOM, model },
    });

    aggregate.apply(
      new StorageCreatedEvent(storageUUID, props.tenantUUID, StorageType.STORE_ROOM, props.name),
    );

    return aggregate;
  }

  static createWarehouse(props: {
    tenantUUID: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
    address: string;
  }): StorageAggregate {
    const storageUUID = uuidV7();

    const model = WarehouseModel.create({
      uuid: uuidV7(),
      name: props.name,
      description: props.description,
      icon: props.icon,
      color: props.color,
      address: props.address,
    });

    const aggregate = new StorageAggregate({
      uuid: storageUUID,
      tenantUUID: props.tenantUUID,
      parentUUID: null,
      sub: { type: StorageType.WAREHOUSE, model },
    });

    aggregate.apply(
      new StorageCreatedEvent(storageUUID, props.tenantUUID, StorageType.WAREHOUSE, props.name),
    );

    return aggregate;
  }

  static reconstitute(props: StorageAggregateReconstituteProps): StorageAggregate {
    return new StorageAggregate({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
      frozenAt: props.frozenAt,
      tenantUUID: props.tenantUUID,
      parentUUID: props.parentUUID,
      sub: props.sub,
    });
  }

  get tenantUUID(): string {
    return this._tenantUUID;
  }

  get type(): StorageType {
    return this._sub.type;
  }

  get parentUUID(): string | null {
    return this._parentUUID;
  }

  get name(): string {
    return this._sub.model.name.getValue();
  }

  get description(): string | null {
    return this._sub.model.description?.getValue() ?? null;
  }

  get icon(): string {
    return this._sub.model.icon.getValue();
  }

  get color(): string {
    return this._sub.model.color.getValue();
  }

  get address(): string {
    return this._sub.model.address.getValue();
  }

  get status(): StorageStatus {
    if (this._archivedAt !== null) return StorageStatus.ARCHIVED;
    if (this._frozenAt !== null) return StorageStatus.FROZEN;
    return StorageStatus.ACTIVE;
  }

  get frozenAt(): Date | null {
    return this._frozenAt;
  }

  isFrozen(): boolean {
    return this._frozenAt !== null && this._archivedAt === null;
  }

  get sub(): StorageSubModel {
    return this._sub;
  }

  get customRoom(): CustomRoomModel | null {
    return this._sub.type === StorageType.CUSTOM_ROOM ? this._sub.model : null;
  }

  get storeRoom(): StoreRoomModel | null {
    return this._sub.type === StorageType.STORE_ROOM ? this._sub.model : null;
  }

  get warehouse(): WarehouseModel | null {
    return this._sub.type === StorageType.WAREHOUSE ? this._sub.model : null;
  }

  updateCustomRoom(props: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    address?: string;
    roomType?: string;
  }): void {
    if (this._sub.type !== StorageType.CUSTOM_ROOM) return;
    this._sub = { type: StorageType.CUSTOM_ROOM, model: this._sub.model.update(props) };
    this.touch();
    this.apply(new StorageUpdatedEvent(this.uuid, this._tenantUUID));
  }

  updateStoreRoom(props: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    address?: string;
  }): void {
    if (this._sub.type !== StorageType.STORE_ROOM) return;
    this._sub = { type: StorageType.STORE_ROOM, model: this._sub.model.update(props) };
    this.touch();
    this.apply(new StorageUpdatedEvent(this.uuid, this._tenantUUID));
  }

  updateWarehouse(props: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    address?: string;
  }): void {
    if (this._sub.type !== StorageType.WAREHOUSE) return;
    this._sub = { type: StorageType.WAREHOUSE, model: this._sub.model.update(props) };
    this.touch();
    this.apply(new StorageUpdatedEvent(this.uuid, this._tenantUUID));
  }

  markArchived(): void {
    this.archive();
    this.apply(new StorageArchivedEvent(this.uuid, this._tenantUUID));
  }
}
