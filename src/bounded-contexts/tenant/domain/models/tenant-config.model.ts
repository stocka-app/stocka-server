import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { TierVO } from '@tenant/domain/value-objects/tier.vo';

export interface TenantConfigReconstituteProps extends BaseModelProps {
  id: number;
  uuid: string;
  tenantId: number;
  tier: string;
  maxWarehouses: number;
  maxUsers: number;
  maxProducts: number;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class TenantConfigModel extends BaseModel {
  private readonly _tenantId: number;
  private _tier: TierVO;
  private _maxWarehouses: number;
  private _maxUsers: number;
  private _maxProducts: number;
  private _notificationsEnabled: boolean;

  private constructor(
    props: BaseModelProps & {
      tenantId: number;
      tier: TierVO;
      maxWarehouses: number;
      maxUsers: number;
      maxProducts: number;
      notificationsEnabled: boolean;
    },
  ) {
    super(props);
    this._tenantId = props.tenantId;
    this._tier = props.tier;
    this._maxWarehouses = props.maxWarehouses;
    this._maxUsers = props.maxUsers;
    this._maxProducts = props.maxProducts;
    this._notificationsEnabled = props.notificationsEnabled;
  }

  static createFreeDefaults(tenantId: number): TenantConfigModel {
    return new TenantConfigModel({
      tenantId,
      tier: TierVO.free(),
      maxWarehouses: 0,
      maxUsers: 1,
      maxProducts: 100,
      notificationsEnabled: true,
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
      maxUsers: props.maxUsers,
      maxProducts: props.maxProducts,
      notificationsEnabled: props.notificationsEnabled,
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

  get maxUsers(): number {
    return this._maxUsers;
  }

  get maxProducts(): number {
    return this._maxProducts;
  }

  get notificationsEnabled(): boolean {
    return this._notificationsEnabled;
  }
}
