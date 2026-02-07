import { CompoundVO } from '@/shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@/shared/domain/exceptions/domain.exception';

class InvalidUserStatusException extends DomainException {
  constructor(value: string) {
    super(`Invalid user status: ${value}`, 'INVALID_USER_STATUS', [
      { field: 'status', message: `Invalid user status: ${value}` },
    ]);
  }
}

export enum UserStatusEnum {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  EMAIL_VERIFIED_BY_PROVIDER = 'email_verified_by_provider',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

export class UserStatusVO extends CompoundVO {
  private static readonly VALID_STATUSES = Object.values(UserStatusEnum);

  private readonly _value: UserStatusEnum;

  constructor(value: string) {
    super();
    this._value = value as UserStatusEnum;
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!UserStatusVO.VALID_STATUSES.includes(this._value)) {
      throw new InvalidUserStatusException(this._value);
    }
  }

  toString(): string {
    return this._value;
  }

  equals(other: UserStatusVO): boolean {
    if (!(other instanceof UserStatusVO)) {
      return false;
    }
    return this._value === other._value;
  }

  isPendingVerification(): boolean {
    return this._value === UserStatusEnum.PENDING_VERIFICATION;
  }

  isActive(): boolean {
    return this._value === UserStatusEnum.ACTIVE;
  }

  isVerifiedByProvider(): boolean {
    return this._value === UserStatusEnum.EMAIL_VERIFIED_BY_PROVIDER;
  }

  isArchived(): boolean {
    return this._value === UserStatusEnum.ARCHIVED;
  }

  isBlocked(): boolean {
    return this._value === UserStatusEnum.BLOCKED;
  }

  canAccessApplication(): boolean {
    return (
      this._value === UserStatusEnum.ACTIVE ||
      this._value === UserStatusEnum.EMAIL_VERIFIED_BY_PROVIDER
    );
  }

  requiresEmailVerification(): boolean {
    return this._value === UserStatusEnum.PENDING_VERIFICATION;
  }

  static pendingVerification(): UserStatusVO {
    return new UserStatusVO(UserStatusEnum.PENDING_VERIFICATION);
  }

  static active(): UserStatusVO {
    return new UserStatusVO(UserStatusEnum.ACTIVE);
  }

  static emailVerifiedByProvider(): UserStatusVO {
    return new UserStatusVO(UserStatusEnum.EMAIL_VERIFIED_BY_PROVIDER);
  }

  static archived(): UserStatusVO {
    return new UserStatusVO(UserStatusEnum.ARCHIVED);
  }

  static blocked(): UserStatusVO {
    return new UserStatusVO(UserStatusEnum.BLOCKED);
  }
}
