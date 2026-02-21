import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { EmailVO } from '@shared/domain/value-objects/compound/email.vo';
import { UsernameVO } from '@user/domain/value-objects/username.vo';
import { UserStatusVO, UserStatusEnum } from '@shared/domain/value-objects/compound/user-status.vo';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';
import { ProviderLinkedEvent } from '@user/domain/events/provider-linked.event';
import { AccountBecameFlexibleEvent } from '@user/domain/events/account-became-flexible.event';

export enum AccountType {
  MANUAL = 'manual',
  SOCIAL = 'social',
  FLEXIBLE = 'flexible',
}

export interface UserProps extends AggregateRootProps {
  email: string;
  username: string;
  passwordHash: string | null;
  provider?: string;
  status?: string;
  emailVerifiedAt?: Date | null;
  verificationBlockedUntil?: Date | null;
  createdWith?: string;
  accountType?: string;
}

export class UserModel extends AggregateRoot {
  private _email: EmailVO;
  private _username: UsernameVO;
  private _passwordHash: string | null;
  private _status: UserStatusVO;
  private _emailVerifiedAt: Date | null;
  private _verificationBlockedUntil: Date | null;
  private readonly _createdWith: string;
  private _accountType: string;

  private constructor(props: UserProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._email = new EmailVO(props.email);
    this._username = new UsernameVO(props.username);
    this._passwordHash = props.passwordHash;
    this._status = new UserStatusVO(props.status || UserStatusEnum.PENDING_VERIFICATION);
    this._emailVerifiedAt = props.emailVerifiedAt ?? null;
    this._verificationBlockedUntil = props.verificationBlockedUntil ?? null;
    this._createdWith = props.createdWith ?? 'email';
    this._accountType = props.accountType ?? AccountType.MANUAL;
  }

  static create(props: Omit<UserProps, 'id'>): UserModel {
    const user = new UserModel({
      ...props,
      status: UserStatusEnum.PENDING_VERIFICATION,
      createdWith: 'email',
      accountType: AccountType.MANUAL,
    });
    user.apply(new UserCreatedEvent(user.uuid, user.email, user.username));
    return user;
  }

  static createFromSocial(props: Omit<UserProps, 'id'> & { provider: string }): UserModel {
    const user = new UserModel({
      ...props,
      status: UserStatusEnum.EMAIL_VERIFIED_BY_PROVIDER,
      emailVerifiedAt: new Date(),
      createdWith: props.provider,
      accountType: AccountType.SOCIAL,
    });
    user.apply(new UserCreatedFromSocialEvent(user.uuid, user.email, props.provider));
    return user;
  }

  static reconstitute(props: UserProps & { id: number; uuid: string }): UserModel {
    return new UserModel(props);
  }

  get email(): string {
    return this._email.toString();
  }

  get username(): string {
    return this._username.toString();
  }

  get passwordHash(): string | null {
    return this._passwordHash;
  }

  get status(): UserStatusVO {
    return this._status;
  }

  get emailVerifiedAt(): Date | null {
    return this._emailVerifiedAt;
  }

  get verificationBlockedUntil(): Date | null {
    return this._verificationBlockedUntil;
  }

  get createdWith(): string {
    return this._createdWith;
  }

  get accountType(): string {
    return this._accountType;
  }

  hasPassword(): boolean {
    return this._passwordHash !== null;
  }

  isEmailVerified(): boolean {
    return this._status.canAccessApplication();
  }

  updatePasswordHash(hash: string): void {
    this._passwordHash = hash;
    this.touch();
    this.apply(new UserPasswordUpdatedEvent(this.uuid));
  }

  verifyEmail(): void {
    this._status = UserStatusVO.active();
    this._emailVerifiedAt = new Date();
    this._verificationBlockedUntil = null;
    this.touch();
  }

  blockVerification(until: Date): void {
    this._verificationBlockedUntil = until;
    this.touch();
  }

  unblockVerification(): void {
    this._verificationBlockedUntil = null;
    this.touch();
  }

  becomeFlexible(provider: string): void {
    this.apply(new ProviderLinkedEvent(this.uuid, provider));
    if (this._accountType !== AccountType.FLEXIBLE) {
      this._accountType = AccountType.FLEXIBLE;
      this.touch();
      this.apply(new AccountBecameFlexibleEvent(this.uuid, provider));
    }
  }
}
