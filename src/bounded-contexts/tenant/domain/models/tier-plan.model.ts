import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { TierPlanNameVO } from '@tenant/domain/value-objects/tier-plan-name.vo';

export interface TierPlanReconstituteProps {
  tier: string;
  name: string;
  maxProducts: number | null;
  maxUsers: number | null;
  maxWarehouses: number | null;
  maxCustomRooms: number;
  maxStoreRooms: number;
  policyVersion: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TierPlanModel {
  private readonly _tier: TierEnum;
  private readonly _name: TierPlanNameVO;
  private readonly _maxProducts: number | null;
  private readonly _maxUsers: number | null;
  private readonly _maxWarehouses: number | null;
  private readonly _maxCustomRooms: number;
  private readonly _maxStoreRooms: number;
  private readonly _policyVersion: Date;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: {
    tier: TierEnum;
    name: TierPlanNameVO;
    maxProducts: number | null;
    maxUsers: number | null;
    maxWarehouses: number | null;
    maxCustomRooms: number;
    maxStoreRooms: number;
    policyVersion: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this._tier = props.tier;
    this._name = props.name;
    this._maxProducts = props.maxProducts;
    this._maxUsers = props.maxUsers;
    this._maxWarehouses = props.maxWarehouses;
    this._maxCustomRooms = props.maxCustomRooms;
    this._maxStoreRooms = props.maxStoreRooms;
    this._policyVersion = props.policyVersion;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static reconstitute(props: TierPlanReconstituteProps): TierPlanModel {
    const tierValue = props.tier as TierEnum;
    if (!Object.values(TierEnum).includes(tierValue)) {
      throw new Error(`Invalid tier value: ${props.tier}`);
    }

    return new TierPlanModel({
      tier: tierValue,
      name: new TierPlanNameVO(props.name),
      maxProducts: props.maxProducts,
      maxUsers: props.maxUsers,
      maxWarehouses: props.maxWarehouses,
      maxCustomRooms: props.maxCustomRooms,
      maxStoreRooms: props.maxStoreRooms,
      policyVersion: props.policyVersion,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get tier(): TierEnum {
    return this._tier;
  }

  get name(): TierPlanNameVO {
    return this._name;
  }

  get maxProducts(): number | null {
    return this._maxProducts;
  }

  get maxUsers(): number | null {
    return this._maxUsers;
  }

  get maxWarehouses(): number | null {
    return this._maxWarehouses;
  }

  get maxCustomRooms(): number {
    return this._maxCustomRooms;
  }

  get maxStoreRooms(): number {
    return this._maxStoreRooms;
  }

  get policyVersion(): Date {
    return this._policyVersion;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isUnlimitedProducts(): boolean {
    return this._maxProducts === null;
  }

  isUnlimitedUsers(): boolean {
    return this._maxUsers === null;
  }

  isUnlimitedWarehouses(): boolean {
    return this._maxWarehouses === null;
  }

  isUnlimitedCustomRooms(): boolean {
    return this._maxCustomRooms === -1;
  }

  isUnlimitedStoreRooms(): boolean {
    return this._maxStoreRooms === -1;
  }
}
