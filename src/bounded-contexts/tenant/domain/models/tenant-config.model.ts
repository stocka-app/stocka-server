import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { TierVO } from '@tenant/domain/value-objects/tier.vo';
import { CapabilitySnapshot } from '@shared/domain/policy/capability-snapshot';

export interface TenantConfigReconstituteProps extends BaseModelProps {
  id: number;
  uuid: string;
  tenantId: number;
  tier: string;
  maxWarehouses: number;
  maxCustomRooms: number;
  maxStoreRooms: number;
  maxUsers: number;
  maxProducts: number;
  notificationsEnabled: boolean;
  productCount: number;
  storageCount: number;
  memberCount: number;
  capabilities: CapabilitySnapshot | null;
  capabilitiesBuiltAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class TenantConfigModel extends BaseModel {
  private readonly _tenantId: number;
  private _tier: TierVO;
  private _maxWarehouses: number;
  private _maxCustomRooms: number;
  private _maxStoreRooms: number;
  private _maxUsers: number;
  private _maxProducts: number;
  private _notificationsEnabled: boolean;
  private _productCount: number;
  private _storageCount: number;
  private _memberCount: number;
  private _capabilities: CapabilitySnapshot | null;
  private _capabilitiesBuiltAt: Date | null;

  private constructor(
    props: BaseModelProps & {
      tenantId: number;
      tier: TierVO;
      maxWarehouses: number;
      maxCustomRooms: number;
      maxStoreRooms: number;
      maxUsers: number;
      maxProducts: number;
      notificationsEnabled: boolean;
      productCount: number;
      storageCount: number;
      memberCount: number;
      capabilities: CapabilitySnapshot | null;
      capabilitiesBuiltAt: Date | null;
    },
  ) {
    super(props);
    this._tenantId = props.tenantId;
    this._tier = props.tier;
    this._maxWarehouses = props.maxWarehouses;
    this._maxCustomRooms = props.maxCustomRooms;
    this._maxStoreRooms = props.maxStoreRooms;
    this._maxUsers = props.maxUsers;
    this._maxProducts = props.maxProducts;
    this._notificationsEnabled = props.notificationsEnabled;
    this._productCount = props.productCount;
    this._storageCount = props.storageCount;
    this._memberCount = props.memberCount;
    this._capabilities = props.capabilities;
    this._capabilitiesBuiltAt = props.capabilitiesBuiltAt;
  }

  static createFreeDefaults(tenantId: number): TenantConfigModel {
    return new TenantConfigModel({
      tenantId,
      tier: TierVO.free(),
      maxWarehouses: 0,
      maxCustomRooms: 1,
      maxStoreRooms: 1,
      maxUsers: 1,
      maxProducts: 100,
      notificationsEnabled: true,
      productCount: 0,
      storageCount: 0,
      memberCount: 1,
      capabilities: null,
      capabilitiesBuiltAt: null,
    });
  }

  static reconstitute(props: TenantConfigReconstituteProps): TenantConfigModel {
    return new TenantConfigModel({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
      tenantId: props.tenantId,
      tier: TierVO.fromString(props.tier),
      maxWarehouses: props.maxWarehouses,
      maxCustomRooms: props.maxCustomRooms,
      maxStoreRooms: props.maxStoreRooms,
      maxUsers: props.maxUsers,
      maxProducts: props.maxProducts,
      notificationsEnabled: props.notificationsEnabled,
      productCount: props.productCount,
      storageCount: props.storageCount,
      memberCount: props.memberCount,
      capabilities: props.capabilities,
      capabilitiesBuiltAt: props.capabilitiesBuiltAt,
    });
  }

  get tenantId(): number {
    return this._tenantId;
  }

  get tier(): TierVO {
    return this._tier;
  }

  get maxWarehouses(): number {
    return this._maxWarehouses;
  }

  get maxCustomRooms(): number {
    return this._maxCustomRooms;
  }

  get maxStoreRooms(): number {
    return this._maxStoreRooms;
  }

  get maxUsers(): number {
    return this._maxUsers;
  }

  get maxProducts(): number {
    return this._maxProducts;
  }

  get notificationsEnabled(): boolean {
    return this._notificationsEnabled;
  }

  get productCount(): number {
    return this._productCount;
  }

  get storageCount(): number {
    return this._storageCount;
  }

  get memberCount(): number {
    return this._memberCount;
  }

  get capabilities(): CapabilitySnapshot | null {
    return this._capabilities;
  }

  get capabilitiesBuiltAt(): Date | null {
    return this._capabilitiesBuiltAt;
  }

  updateCapabilities(snapshot: CapabilitySnapshot): void {
    this._capabilities = snapshot;
    this._capabilitiesBuiltAt = new Date();
    this.touch();
  }
}
