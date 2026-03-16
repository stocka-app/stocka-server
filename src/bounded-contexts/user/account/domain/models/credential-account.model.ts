import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { EmailVO } from '@shared/domain/value-objects/compound/email.vo';
import { AccountStatusVO, AccountStatusEnum } from '@user/account/domain/value-objects/account-status.vo';

export interface CredentialAccountProps extends BaseModelProps {
  accountId: number;
  email: string;
  passwordHash: string | null;
  status?: string;
  emailVerifiedAt?: Date | null;
  verificationBlockedUntil?: Date | null;
  createdWith?: string;
}

export interface CredentialAccountReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  accountId: number;
  email: string;
  passwordHash: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  verificationBlockedUntil: Date | null;
  createdWith: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class CredentialAccountModel extends BaseModel {
  private readonly _accountId: number;
  private _email: EmailVO;
  private _passwordHash: string | null;
  private _status: AccountStatusVO;
  private _emailVerifiedAt: Date | null;
  private _verificationBlockedUntil: Date | null;
  private readonly _createdWith: string;

  private constructor(props: CredentialAccountReconstitueProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._accountId = props.accountId;
    this._email = new EmailVO(props.email);
    this._passwordHash = props.passwordHash;
    this._status = new AccountStatusVO(props.status);
    this._emailVerifiedAt = props.emailVerifiedAt;
    this._verificationBlockedUntil = props.verificationBlockedUntil;
    this._createdWith = props.createdWith;
  }

  static create(props: {
    accountId: number;
    email: string;
    passwordHash: string | null;
    createdWith: string;
  }): CredentialAccountModel {
    return new CredentialAccountModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      accountId: props.accountId,
      email: props.email,
      passwordHash: props.passwordHash,
      status: AccountStatusEnum.PENDING_VERIFICATION,
      emailVerifiedAt: null,
      verificationBlockedUntil: null,
      createdWith: props.createdWith,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static createFromSocial(props: {
    accountId: number;
    email: string;
    provider: string;
  }): CredentialAccountModel {
    return new CredentialAccountModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      accountId: props.accountId,
      email: props.email,
      passwordHash: null,
      status: AccountStatusEnum.EMAIL_VERIFIED_BY_PROVIDER,
      emailVerifiedAt: new Date(),
      verificationBlockedUntil: null,
      createdWith: props.provider,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: CredentialAccountReconstitueProps): CredentialAccountModel {
    return new CredentialAccountModel(props);
  }

  get accountId(): number {
    return this._accountId;
  }

  get email(): string {
    return this._email.toString();
  }

  get passwordHash(): string | null {
    return this._passwordHash;
  }

  get status(): AccountStatusVO {
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

  hasPassword(): boolean {
    return this._passwordHash !== null;
  }

  isEmailVerified(): boolean {
    return this._emailVerifiedAt !== null;
  }

  isPendingVerification(): boolean {
    return this._status.isPendingVerification();
  }

  requiresEmailVerification(): boolean {
    return this._status.requiresEmailVerification();
  }

  canAccessApplication(): boolean {
    return this._status.canAccessApplication();
  }

  verifyEmail(): void {
    this._status = AccountStatusVO.active();
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

  updatePasswordHash(hash: string): void {
    this._passwordHash = hash;
    this.touch();
  }
}
