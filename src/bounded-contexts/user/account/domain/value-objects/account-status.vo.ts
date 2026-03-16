export enum AccountStatusEnum {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  EMAIL_VERIFIED_BY_PROVIDER = 'email_verified_by_provider',
  BLOCKED = 'blocked',
  ARCHIVED = 'archived',
}

export class AccountStatusVO {
  private readonly _value: AccountStatusEnum;

  constructor(value: string) {
    const normalized = value as AccountStatusEnum;
    if (!Object.values(AccountStatusEnum).includes(normalized)) {
      throw new Error(`Invalid AccountStatus value: ${value}`);
    }
    this._value = normalized;
  }

  static pendingVerification(): AccountStatusVO {
    return new AccountStatusVO(AccountStatusEnum.PENDING_VERIFICATION);
  }

  static active(): AccountStatusVO {
    return new AccountStatusVO(AccountStatusEnum.ACTIVE);
  }

  static emailVerifiedByProvider(): AccountStatusVO {
    return new AccountStatusVO(AccountStatusEnum.EMAIL_VERIFIED_BY_PROVIDER);
  }

  static blocked(): AccountStatusVO {
    return new AccountStatusVO(AccountStatusEnum.BLOCKED);
  }

  static archived(): AccountStatusVO {
    return new AccountStatusVO(AccountStatusEnum.ARCHIVED);
  }

  isPendingVerification(): boolean {
    return this._value === AccountStatusEnum.PENDING_VERIFICATION;
  }

  isActive(): boolean {
    return this._value === AccountStatusEnum.ACTIVE;
  }

  isEmailVerifiedByProvider(): boolean {
    return this._value === AccountStatusEnum.EMAIL_VERIFIED_BY_PROVIDER;
  }

  isBlocked(): boolean {
    return this._value === AccountStatusEnum.BLOCKED;
  }

  isArchived(): boolean {
    return this._value === AccountStatusEnum.ARCHIVED;
  }

  canAccessApplication(): boolean {
    return this.isActive() || this.isEmailVerifiedByProvider();
  }

  requiresEmailVerification(): boolean {
    return this.isPendingVerification();
  }

  equals(other: AccountStatusVO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
