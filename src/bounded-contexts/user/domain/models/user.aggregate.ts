import { AggregateRoot, AggregateRootProps } from '@shared/domain/base/aggregate-root';
import { IUserView } from '@shared/domain/contracts/user-view.contract';
import { EmailVO } from '@shared/domain/value-objects/compound/email.vo';
import { PasswordHashVO } from '@shared/domain/value-objects/primitive/password-hash.vo';
import { UsernameVO } from '@user/domain/value-objects/username.vo';
import { UserStatusVO, UserStatusEnum } from '@shared/domain/value-objects/compound/user-status.vo';
import { AccountTypeVO, AccountTypeEnum } from '@user/domain/value-objects/account-type.vo';
import { OAuthProviderVO, OAuthProviderEnum } from '@user/domain/value-objects/oauth-provider.vo';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';
import { ProviderLinkedEvent } from '@user/domain/events/provider-linked.event';
import { AccountBecameFlexibleEvent } from '@user/domain/events/account-became-flexible.event';

/** @deprecated Use AccountTypeEnum from account-type.vo.ts */
export const AccountType = AccountTypeEnum;

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

export class UserAggregate extends AggregateRoot implements IUserView {
  private _email: EmailVO;
  private _username: UsernameVO;
  private _passwordHash: PasswordHashVO | null;
  private _status: UserStatusVO;
  private _emailVerifiedAt: Date | null;
  private _verificationBlockedUntil: Date | null;
  private readonly _createdWith: OAuthProviderVO;
  private _accountType: AccountTypeVO;

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
    this._passwordHash = props.passwordHash ? new PasswordHashVO(props.passwordHash) : null;
    this._status = new UserStatusVO(props.status || UserStatusEnum.PENDING_VERIFICATION);
    this._emailVerifiedAt = props.emailVerifiedAt ?? null;
    this._verificationBlockedUntil = props.verificationBlockedUntil ?? null;
    this._createdWith = new OAuthProviderVO(props.createdWith ?? OAuthProviderEnum.LOCAL);
    this._accountType = new AccountTypeVO(props.accountType ?? AccountTypeEnum.MANUAL);
  }

  static create(props: Omit<UserProps, 'id'>): UserAggregate {
    const user = new UserAggregate({
      ...props,
      status: UserStatusEnum.PENDING_VERIFICATION,
      createdWith: OAuthProviderEnum.LOCAL,
      accountType: AccountTypeEnum.MANUAL,
    });
    user.apply(new UserCreatedEvent(user.uuid, user.email, user.username));
    return user;
  }

  static createFromSocial(props: Omit<UserProps, 'id'> & { provider: string }): UserAggregate {
    const user = new UserAggregate({
      ...props,
      status: UserStatusEnum.EMAIL_VERIFIED_BY_PROVIDER,
      emailVerifiedAt: new Date(),
      createdWith: props.provider,
      accountType: AccountTypeEnum.SOCIAL,
    });
    user.apply(new UserCreatedFromSocialEvent(user.uuid, user.email, props.provider));
    return user;
  }

  static reconstitute(props: UserProps & { id: number; uuid: string }): UserAggregate {
    return new UserAggregate(props);
  }

  get email(): string {
    return this._email.toString();
  }

  get username(): string {
    return this._username.toString();
  }

  get passwordHash(): string | null {
    return this._passwordHash?.getValue() ?? null;
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
    return this._createdWith.toString();
  }

  get accountType(): string {
    return this._accountType.toString();
  }

  hasPassword(): boolean {
    return this._passwordHash !== null;
  }

  isFlexiblePending(): boolean {
    return this._accountType.isFlexible() && this._status.isPendingVerification();
  }

  isEmailVerified(): boolean {
    return this._status.canAccessApplication();
  }

  isPendingVerification(): boolean {
    return this._status.isPendingVerification();
  }

  requiresEmailVerification(): boolean {
    return this._status.requiresEmailVerification();
  }

  updatePasswordHash(hash: string): void {
    this._passwordHash = new PasswordHashVO(hash);
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

  becomeFlexible(provider: string, isFlexiblePending: boolean): void {
    this.apply(new ProviderLinkedEvent(this.uuid, provider, isFlexiblePending));
    if (!this._accountType.isFlexible()) {
      this._accountType = AccountTypeVO.flexible();
      this.touch();
      this.apply(new AccountBecameFlexibleEvent(this.uuid, 'oauth_link'));
    }
  }

  setPasswordAndBecomeFlexible(hash: string): void {
    this._passwordHash = new PasswordHashVO(hash);
    this._accountType = AccountTypeVO.flexible();
    this.touch();
    this.apply(new AccountBecameFlexibleEvent(this.uuid, 'password_set'));
  }
}
