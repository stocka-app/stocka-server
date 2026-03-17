export enum TierEnum {
  FREE = 'FREE',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  ENTERPRISE = 'ENTERPRISE',
}

export class TierVO {
  private readonly _value: TierEnum;

  private constructor(value: TierEnum) {
    this._value = value;
  }

  static fromString(value: string): TierVO {
    const normalized = value as TierEnum;
    if (!Object.values(TierEnum).includes(normalized)) {
      throw new Error(`Invalid Tier value: ${value}`);
    }
    return new TierVO(normalized);
  }

  static free(): TierVO {
    return new TierVO(TierEnum.FREE);
  }

  static starter(): TierVO {
    return new TierVO(TierEnum.STARTER);
  }

  static growth(): TierVO {
    return new TierVO(TierEnum.GROWTH);
  }

  static enterprise(): TierVO {
    return new TierVO(TierEnum.ENTERPRISE);
  }

  isFree(): boolean {
    return this._value === TierEnum.FREE;
  }

  isStarter(): boolean {
    return this._value === TierEnum.STARTER;
  }

  isGrowth(): boolean {
    return this._value === TierEnum.GROWTH;
  }

  isEnterprise(): boolean {
    return this._value === TierEnum.ENTERPRISE;
  }

  equals(other: TierVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
