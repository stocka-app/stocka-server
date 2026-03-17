export enum TenantStatusEnum {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export class TenantStatusVO {
  private readonly _value: TenantStatusEnum;

  private constructor(value: TenantStatusEnum) {
    this._value = value;
  }

  static fromString(value: string): TenantStatusVO {
    const normalized = value as TenantStatusEnum;
    if (!Object.values(TenantStatusEnum).includes(normalized)) {
      throw new Error(`Invalid TenantStatus value: ${value}`);
    }
    return new TenantStatusVO(normalized);
  }

  static active(): TenantStatusVO {
    return new TenantStatusVO(TenantStatusEnum.ACTIVE);
  }

  static suspended(): TenantStatusVO {
    return new TenantStatusVO(TenantStatusEnum.SUSPENDED);
  }

  static cancelled(): TenantStatusVO {
    return new TenantStatusVO(TenantStatusEnum.CANCELLED);
  }

  isActive(): boolean {
    return this._value === TenantStatusEnum.ACTIVE;
  }

  isSuspended(): boolean {
    return this._value === TenantStatusEnum.SUSPENDED;
  }

  isCancelled(): boolean {
    return this._value === TenantStatusEnum.CANCELLED;
  }

  equals(other: TenantStatusVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
