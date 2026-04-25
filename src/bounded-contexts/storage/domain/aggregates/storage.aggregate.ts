import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageItemView } from '@storage/domain/schemas';

export interface StorageAggregateReconstituteProps extends AggregateRootProps {
  id: number;
  uuid: string;
  tenantUUID: string;
  warehouses: WarehouseAggregate[];
  storeRooms: StoreRoomAggregate[];
  customRooms: CustomRoomAggregate[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Container row that anchors a tenant's storages at the persistence layer
 * (one `storages` table row per tenant; per-type rows reference it via
 * FK). After the per-type aggregates were promoted (Warehouse / StoreRoom
 * / CustomRoom each became its own root with its own repository), this
 * "aggregate" no longer owns transitions or invariants — it only
 * provides:
 *
 *   - the FK id used by per-type repositories on insert
 *   - view assembly (`listItemViews`) for the read-side query handlers
 *
 * It will be flattened to a `StorageContainerModel` (plain Model) +
 * dedicated query in a follow-up cleanup. Kept as `AggregateRoot` for
 * now to avoid cascading the rename across queries / mappers / module
 * wiring in the same iteration.
 */
export class StorageAggregate extends AggregateRoot {
  private readonly _tenantUUID: UUIDVO;
  private _warehouses: WarehouseAggregate[];
  private _storeRooms: StoreRoomAggregate[];
  private _customRooms: CustomRoomAggregate[];

  private constructor(
    props: AggregateRootProps & {
      tenantUUID: string;
      warehouses: WarehouseAggregate[];
      storeRooms: StoreRoomAggregate[];
      customRooms: CustomRoomAggregate[];
    },
  ) {
    super(props);
    this._tenantUUID = new UUIDVO(props.tenantUUID);
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

  // ── Find items ─────────────────────────────────────────────────────────

  findWarehouse(uuid: string): WarehouseAggregate | null {
    return this._warehouses.find((w) => w.uuid === uuid) ?? null;
  }

  findStoreRoom(uuid: string): StoreRoomAggregate | null {
    return this._storeRooms.find((s) => s.uuid === uuid) ?? null;
  }

  findCustomRoom(uuid: string): CustomRoomAggregate | null {
    return this._customRooms.find((c) => c.uuid === uuid) ?? null;
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
        uuid: w.uuid,
        type: StorageType.WAREHOUSE,
        name: w.name.getValue(),
        description: w.description?.getValue() ?? null,
        icon: w.icon.getValue(),
        color: w.color.getValue(),
        address: w.address.getValue(),
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
        uuid: s.uuid,
        type: StorageType.STORE_ROOM,
        name: s.name.getValue(),
        description: s.description?.getValue() ?? null,
        icon: s.icon.getValue(),
        color: s.color.getValue(),
        address: s.address?.getValue() ?? null,
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
        uuid: c.uuid,
        type: StorageType.CUSTOM_ROOM,
        name: c.name.getValue(),
        description: c.description?.getValue() ?? null,
        icon: c.icon.getValue(),
        color: c.color.getValue(),
        address: c.address?.getValue() ?? null,
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

  get tenantUUID(): UUIDVO {
    return this._tenantUUID;
  }

  get warehouses(): readonly WarehouseAggregate[] {
    return this._warehouses;
  }

  get storeRooms(): readonly StoreRoomAggregate[] {
    return this._storeRooms;
  }

  get customRooms(): readonly CustomRoomAggregate[] {
    return this._customRooms;
  }
}
