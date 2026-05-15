import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';
import { InvalidTierChangeStateException } from '@billing/domain/exceptions/validation/invalid-tier-change-state.exception';

export enum TierChangeStateEnum {
  COLD_DOWN = 'COLD_DOWN',
  EFFECTIVE = 'EFFECTIVE',
  GRACE = 'GRACE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  REVERTED = 'REVERTED',
}

export class TierChangeStateVO extends EnumValueObject<TierChangeStateEnum> {
  constructor(value: string) {
    super(value, Object.values(TierChangeStateEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidTierChangeStateException(value);
  }

  isPending(): boolean {
    return this._value === TierChangeStateEnum.COLD_DOWN;
  }

  isEffective(): boolean {
    return this._value === TierChangeStateEnum.EFFECTIVE;
  }

  isInGrace(): boolean {
    return this._value === TierChangeStateEnum.GRACE;
  }

  isArchived(): boolean {
    return this._value === TierChangeStateEnum.ARCHIVED;
  }

  isDeleted(): boolean {
    return this._value === TierChangeStateEnum.DELETED;
  }

  isReverted(): boolean {
    return this._value === TierChangeStateEnum.REVERTED;
  }

  isFinal(): boolean {
    return this._value === TierChangeStateEnum.DELETED;
  }

  isRevertable(): boolean {
    return (
      this._value === TierChangeStateEnum.COLD_DOWN ||
      this._value === TierChangeStateEnum.EFFECTIVE ||
      this._value === TierChangeStateEnum.GRACE ||
      this._value === TierChangeStateEnum.ARCHIVED
    );
  }

  static coldDown(): TierChangeStateVO {
    return new TierChangeStateVO(TierChangeStateEnum.COLD_DOWN);
  }

  static effective(): TierChangeStateVO {
    return new TierChangeStateVO(TierChangeStateEnum.EFFECTIVE);
  }

  static grace(): TierChangeStateVO {
    return new TierChangeStateVO(TierChangeStateEnum.GRACE);
  }

  static archived(): TierChangeStateVO {
    return new TierChangeStateVO(TierChangeStateEnum.ARCHIVED);
  }

  static deleted(): TierChangeStateVO {
    return new TierChangeStateVO(TierChangeStateEnum.DELETED);
  }

  static reverted(): TierChangeStateVO {
    return new TierChangeStateVO(TierChangeStateEnum.REVERTED);
  }
}
