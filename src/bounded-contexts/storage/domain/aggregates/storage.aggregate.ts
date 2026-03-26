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

export interface StorageAggregateReconstituteProps extends AggregateRootProps {
  id: number;
  uuid: string;
  tenantUUID: string;
  type: StorageType;
  name: string;
  customRoom: CustomRoomModel | null;
  storeRoom: StoreRoomModel | null;
  warehouse: WarehouseModel | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class StorageAggregate extends AggregateRoot {
  private readonly _tenantUUID: string;
  private readonly _type: StorageType;
  private _name: string;
  private readonly _customRoom: CustomRoomModel | null;
  private readonly _storeRoom: StoreRoomModel | null;
  private readonly _warehouse: WarehouseModel | null;

  private constructor(
    props: AggregateRootProps & {
      tenantUUID: string;
      type: StorageType;
      name: string;
      customRoom: CustomRoomModel | null;
      storeRoom: StoreRoomModel | null;
      warehouse: WarehouseModel | null;
    },
  ) {
    super(props);
    this._tenantUUID = props.tenantUUID;
    this._type = props.type;
    this._name = props.name;
    this._customRoom = props.customRoom;
    this._storeRoom = props.storeRoom;
    this._warehouse = props.warehouse;
  }

  static createCustomRoom(props: {
    tenantUUID: string;
    name: string;
    roomType: string;
    address?: string;
  }): StorageAggregate {
    const storageUUID = uuidV7();
    const subUUID = uuidV7();

    const customRoom = CustomRoomModel.create({
      uuid: subUUID,
      roomType: props.roomType,
      address: props.address,
    });

    const aggregate = new StorageAggregate({
      uuid: storageUUID,
      tenantUUID: props.tenantUUID,
      type: StorageType.CUSTOM_ROOM,
      name: props.name,
      customRoom,
      storeRoom: null,
      warehouse: null,
    });

    aggregate.apply(
      new StorageCreatedEvent(storageUUID, props.tenantUUID, StorageType.CUSTOM_ROOM, props.name),
    );

    return aggregate;
  }

  static createStoreRoom(props: {
    tenantUUID: string;
    name: string;
    address?: string;
  }): StorageAggregate {
    const storageUUID = uuidV7();
    const subUUID = uuidV7();

    const storeRoom = StoreRoomModel.create({
      uuid: subUUID,
      address: props.address,
    });

    const aggregate = new StorageAggregate({
      uuid: storageUUID,
      tenantUUID: props.tenantUUID,
      type: StorageType.STORE_ROOM,
      name: props.name,
      customRoom: null,
      storeRoom,
      warehouse: null,
    });

    aggregate.apply(
      new StorageCreatedEvent(storageUUID, props.tenantUUID, StorageType.STORE_ROOM, props.name),
    );

    return aggregate;
  }

  static createWarehouse(props: {
    tenantUUID: string;
    name: string;
    address: string;
  }): StorageAggregate {
    const storageUUID = uuidV7();
    const subUUID = uuidV7();

    const warehouseModel = WarehouseModel.create({
      uuid: subUUID,
      address: props.address,
    });

    const aggregate = new StorageAggregate({
      uuid: storageUUID,
      tenantUUID: props.tenantUUID,
      type: StorageType.WAREHOUSE,
      name: props.name,
      customRoom: null,
      storeRoom: null,
      warehouse: warehouseModel,
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
      tenantUUID: props.tenantUUID,
      type: props.type,
      name: props.name,
      customRoom: props.customRoom,
      storeRoom: props.storeRoom,
      warehouse: props.warehouse,
    });
  }

  get tenantUUID(): string {
    return this._tenantUUID;
  }

  get status(): StorageStatus {
    if (this._archivedAt !== null) return StorageStatus.ARCHIVED;
    return StorageStatus.ACTIVE;
  }

  get type(): StorageType {
    return this._type;
  }

  get name(): string {
    return this._name;
  }

  get customRoom(): CustomRoomModel | null {
    return this._customRoom;
  }

  get storeRoom(): StoreRoomModel | null {
    return this._storeRoom;
  }

  get warehouse(): WarehouseModel | null {
    return this._warehouse;
  }

  get address(): string | null {
    if (this._customRoom) return this._customRoom.address;
    if (this._storeRoom) return this._storeRoom.address;
    if (this._warehouse) return this._warehouse.address;
    return null;
  }

  updateName(newName: string): void {
    this._name = newName;
    this.touch();
    this.apply(new StorageUpdatedEvent(this.uuid, this._tenantUUID));
  }

  markArchived(): void {
    this.archive();
    this.apply(new StorageArchivedEvent(this.uuid, this._tenantUUID));
  }
}
