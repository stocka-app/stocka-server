import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { TierVO } from '@tenant/domain/value-objects/tier.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum TierChangeDirectionEnum {
  UPGRADE = 'UPGRADE',
  DOWNGRADE = 'DOWNGRADE',
}

const TIER_RANK: Record<TierEnum, number> = {
  [TierEnum.FREE]: 0,
  [TierEnum.STARTER]: 1,
  [TierEnum.GROWTH]: 2,
  [TierEnum.ENTERPRISE]: 3,
};

export class InvalidTierChangeDirectionException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change direction: ${value}`, 'INVALID_TIER_CHANGE_DIRECTION', [
      { field: 'direction', message: `Invalid tier change direction: ${value}` },
    ]);
  }
}

export class SameTierDirectionException extends DomainException {
  constructor(tier: string) {
    super(`Cannot derive direction: from and to tiers are equal (${tier})`, 'SAME_TIER_DIRECTION', [
      { field: 'tier', message: `From and to tiers are equal: ${tier}` },
    ]);
  }
}

export class TierChangeDirectionVO extends EnumValueObject<TierChangeDirectionEnum> {
  constructor(value: string) {
    super(value, Object.values(TierChangeDirectionEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidTierChangeDirectionException(value);
  }

  isUpgrade(): boolean {
    return this._value === TierChangeDirectionEnum.UPGRADE;
  }

  isDowngrade(): boolean {
    return this._value === TierChangeDirectionEnum.DOWNGRADE;
  }

  static upgrade(): TierChangeDirectionVO {
    return new TierChangeDirectionVO(TierChangeDirectionEnum.UPGRADE);
  }

  static downgrade(): TierChangeDirectionVO {
    return new TierChangeDirectionVO(TierChangeDirectionEnum.DOWNGRADE);
  }

  /**
   * Derives direction from a pair of tiers using their rank order
   * (FREE < STARTER < GROWTH < ENTERPRISE). Throws SameTierDirectionException
   * if both tiers are equal — that's a no-op and should be rejected upstream
   * by SameTierChangeException, not silently mapped to a direction.
   */
  static fromTiers(from: TierVO, to: TierVO): TierChangeDirectionVO {
    const fromValue = from.toString() as TierEnum;
    const toValue = to.toString() as TierEnum;
    if (fromValue === toValue) {
      throw new SameTierDirectionException(fromValue);
    }
    return TIER_RANK[toValue] > TIER_RANK[fromValue]
      ? TierChangeDirectionVO.upgrade()
      : TierChangeDirectionVO.downgrade();
  }
}
