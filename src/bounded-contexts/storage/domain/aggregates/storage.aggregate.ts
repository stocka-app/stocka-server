import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageUpdatedEvent } from '@storage/domain/events/storage-updated.event';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { StorageItemView } from '@storage/domain/schemas';
import {
  UpdateWarehouseProps,
  UpdateStoreRoomProps,
  UpdateCustomRoomProps,
} from '@storage/domain/schemas';

export interface StorageAggregateReconstituteProps extends AggregateRootProps {
  id: number;
  uuid: string;
  tenantUUID: string;
  warehouses: WarehouseModel[];
  storeRooms: StoreRoomModel[];
  customRooms: CustomRoomModel[];
  createdAt: Date;
  updatedAt: Date;
}

export class StorageAggregate extends AggregateRoot {
  private readonly _tenantUUID: string;
  private _warehouses: WarehouseModel[];
  private _storeRooms: StoreRoomModel[];
  private _customRooms: CustomRoomModel[];

  private constructor(
    props: AggregateRootProps & {
      tenantUUID: string;
      warehouses: WarehouseModel[];
      storeRooms: StoreRoomModel[];
      customRooms: CustomRoomModel[];
    },
  ) {
    super(props);
    this._tenantUUID = props.tenantUUID;
    this._warehouses = props.warehouses;
    this._storeRooms = props.storeRooms;
    this._customRooms = props.customRooms;
  }

  static create(props: { tenantUUID: string }): StorageAggregate {
    return new StorageAggregate({
      tenantUUID: props.tenantUUID,
      warehouses: [],
      storeRooms: [],
      customRooms: [],
    });
  }

  static reconstitute(props: StorageAggregateReconstituteProps): StorageAggregate {
    return new StorageAggregate({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      tenantUUID: props.tenantUUID,
      warehouses: props.warehouses,
      storeRooms: props.storeRooms,
      customRooms: props.customRooms,
    });
  }

  // ── Add items ──────────────────────────────────────────────────────────

  addWarehouse(model: WarehouseModel): void {
    this._warehouses.push(model);
    this.apply(
      new StorageCreatedEvent(
        model.uuid.toString(),
        this._tenantUUID,
        StorageType.WAREHOUSE,
        model.name.getValue(),
      ),
    );
  }

  addStoreRoom(model: StoreRoomModel): void {
    this._storeRooms.push(model);
    this.apply(
      new StorageCreatedEvent(
        model.uuid.toString(),
        this._tenantUUID,
        StorageType.STORE_ROOM,
        model.name.getValue(),
      ),
    );
  }

  addCustomRoom(model: CustomRoomModel): void {
    this._customRooms.push(model);
    this.apply(
      new StorageCreatedEvent(
        model.uuid.toString(),
        this._tenantUUID,
        StorageType.CUSTOM_ROOM,
        model.name.getValue(),
      ),
    );
  }

  // ── Find items ─────────────────────────────────────────────────────────

  findWarehouse(uuid: string): WarehouseModel | null {
    return this._warehouses.find((w) => w.uuid.toString() === uuid) ?? null;
  }

  findStoreRoom(uuid: string): StoreRoomModel | null {
    return this._storeRooms.find((s) => s.uuid.toString() === uuid) ?? null;
  }

  findCustomRoom(uuid: string): CustomRoomModel | null {
    return this._customRooms.find((c) => c.uuid.toString() === uuid) ?? null;
  }

  // ── Update items ───────────────────────────────────────────────────────

  updateWarehouse(uuid: string, props: UpdateWarehouseProps): void {
    const idx = this._warehouses.findIndex((w) => w.uuid.toString() === uuid);
    if (idx === -1) return;
    this._warehouses[idx] = this._warehouses[idx].update(props);
    this.touch();
    this.apply(new StorageUpdatedEvent(uuid, this._tenantUUID));
  }

  updateStoreRoom(uuid: string, props: UpdateStoreRoomProps): void {
    const idx = this._storeRooms.findIndex((s) => s.uuid.toString() === uuid);
    if (idx === -1) return;
    this._storeRooms[idx] = this._storeRooms[idx].update(props);
    this.touch();
    this.apply(new StorageUpdatedEvent(uuid, this._tenantUUID));
  }

  updateCustomRoom(uuid: string, props: UpdateCustomRoomProps): void {
    const idx = this._customRooms.findIndex((c) => c.uuid.toString() === uuid);
    if (idx === -1) return;
    this._customRooms[idx] = this._customRooms[idx].update(props);
    this.touch();
    this.apply(new StorageUpdatedEvent(uuid, this._tenantUUID));
  }

  // ── Archive items ──────────────────────────────────────────────────────

  archiveWarehouse(uuid: string): void {
    const idx = this._warehouses.findIndex((w) => w.uuid.toString() === uuid);
    if (idx === -1) return;
    this._warehouses[idx] = this._warehouses[idx].markArchived();
    this.touch();
    this.apply(new StorageArchivedEvent(uuid, this._tenantUUID));
  }

  archiveStoreRoom(uuid: string): void {
    const idx = this._storeRooms.findIndex((s) => s.uuid.toString() === uuid);
    if (idx === -1) return;
    this._storeRooms[idx] = this._storeRooms[idx].markArchived();
    this.touch();
    this.apply(new StorageArchivedEvent(uuid, this._tenantUUID));
  }

  archiveCustomRoom(uuid: string): void {
    const idx = this._customRooms.findIndex((c) => c.uuid.toString() === uuid);
    if (idx === -1) return;
    this._customRooms[idx] = this._customRooms[idx].markArchived();
    this.touch();
    this.apply(new StorageArchivedEvent(uuid, this._tenantUUID));
  }

  // ── Views ──────────────────────────────────────────────────────────────

  findItemView(uuid: string): StorageItemView | null {
    const all = this.listItemViews();
    return all.find((v) => v.uuid === uuid) ?? null;
  }

  listItemViews(): StorageItemView[] {
    const views: StorageItemView[] = [];

    for (const w of this._warehouses) {
      views.push({
        uuid: w.uuid.toString(),
        type: StorageType.WAREHOUSE,
        name: w.name.getValue(),
        description: w.description?.getValue() ?? null,
        icon: w.icon.getValue(),
        color: w.color.getValue(),
        address: w.address.getValue(),
        parentUUID: null,
        archivedAt: w.archivedAt,
        frozenAt: w.frozenAt,
        status: w.status,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        roomType: null,
      });
    }

    for (const s of this._storeRooms) {
      views.push({
        uuid: s.uuid.toString(),
        type: StorageType.STORE_ROOM,
        name: s.name.getValue(),
        description: s.description?.getValue() ?? null,
        icon: s.icon.getValue(),
        color: s.color.getValue(),
        address: s.address.getValue(),
        parentUUID: s.parentUUID,
        archivedAt: s.archivedAt,
        frozenAt: s.frozenAt,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        roomType: null,
      });
    }

    for (const c of this._customRooms) {
      views.push({
        uuid: c.uuid.toString(),
        type: StorageType.CUSTOM_ROOM,
        name: c.name.getValue(),
        description: c.description?.getValue() ?? null,
        icon: c.icon.getValue(),
        color: c.color.getValue(),
        address: c.address.getValue(),
        parentUUID: c.parentUUID?.toString() ?? null,
        archivedAt: c.archivedAt,
        frozenAt: c.frozenAt,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        roomType: c.roomType.getValue(),
      });
    }

    return views;
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get tenantUUID(): string {
    return this._tenantUUID;
  }

  get warehouses(): readonly WarehouseModel[] {
    return this._warehouses;
  }

  get storeRooms(): readonly StoreRoomModel[] {
    return this._storeRooms;
  }

  get customRooms(): readonly CustomRoomModel[] {
    return this._customRooms;
  }
}
