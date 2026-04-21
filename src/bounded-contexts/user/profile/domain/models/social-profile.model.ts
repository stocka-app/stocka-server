import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { OAuthProviderVO } from '@user/domain/value-objects/oauth-provider.vo';

export interface SocialProfileReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  profileId: number;
  socialAccountUUID: string;
  provider: string;
  providerDisplayName: string | null;
  providerAvatarUrl: string | null;
  providerProfileUrl: string | null;
  givenName: string | null;
  familyName: string | null;
  locale: string | null;
  emailVerified: boolean;
  jobTitle: string | null;
  rawData: Record<string, unknown>;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class SocialProfileModel extends BaseModel {
  private readonly _profileId: number;
  private _socialAccountUUID: string;
  private _provider: OAuthProviderVO;
  private _providerDisplayName: string | null;
  private _providerAvatarUrl: string | null;
  private _providerProfileUrl: string | null;
  private _givenName: string | null;
  private _familyName: string | null;
  private _locale: string | null;
  private _emailVerified: boolean;
  private _jobTitle: string | null;
  private _rawData: Record<string, unknown>;
  private _syncedAt: Date;

  private constructor(props: SocialProfileReconstitueProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._profileId = props.profileId;
    this._socialAccountUUID = props.socialAccountUUID;
    this._provider = new OAuthProviderVO(props.provider);
    this._providerDisplayName = props.providerDisplayName;
    this._providerAvatarUrl = props.providerAvatarUrl;
    this._providerProfileUrl = props.providerProfileUrl;
    this._givenName = props.givenName;
    this._familyName = props.familyName;
    this._locale = props.locale;
    this._emailVerified = props.emailVerified;
    this._jobTitle = props.jobTitle;
    this._rawData = props.rawData;
    this._syncedAt = props.syncedAt;
  }

  static create(props: {
    profileId: number;
    socialAccountUUID: string;
    provider: string;
    providerDisplayName?: string | null;
    providerAvatarUrl?: string | null;
    providerProfileUrl?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    locale?: string | null;
    emailVerified?: boolean;
    jobTitle?: string | null;
    rawData?: Record<string, unknown>;
  }): SocialProfileModel {
    return new SocialProfileModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      profileId: props.profileId,
      socialAccountUUID: props.socialAccountUUID,
      provider: props.provider,
      providerDisplayName: props.providerDisplayName ?? null,
      providerAvatarUrl: props.providerAvatarUrl ?? null,
      providerProfileUrl: props.providerProfileUrl ?? null,
      givenName: props.givenName ?? null,
      familyName: props.familyName ?? null,
      locale: props.locale ?? null,
      emailVerified: props.emailVerified ?? false,
      jobTitle: props.jobTitle ?? null,
      rawData: props.rawData ?? {},
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: SocialProfileReconstitueProps): SocialProfileModel {
    return new SocialProfileModel(props);
  }

  get profileId(): number {
    return this._profileId;
  }

  get socialAccountUUID(): string {
    return this._socialAccountUUID;
  }

  get provider(): string {
    return this._provider.toString();
  }

  get providerDisplayName(): string | null {
    return this._providerDisplayName;
  }

  get providerAvatarUrl(): string | null {
    return this._providerAvatarUrl;
  }

  get providerProfileUrl(): string | null {
    return this._providerProfileUrl;
  }

  get givenName(): string | null {
    return this._givenName;
  }

  get familyName(): string | null {
    return this._familyName;
  }

  get locale(): string | null {
    return this._locale;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get jobTitle(): string | null {
    return this._jobTitle;
  }

  get rawData(): Record<string, unknown> {
    return this._rawData;
  }

  get syncedAt(): Date {
    return this._syncedAt;
  }

  refreshSync(props: {
    providerDisplayName?: string | null;
    providerAvatarUrl?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    locale?: string | null;
    emailVerified?: boolean;
    jobTitle?: string | null;
    rawData?: Record<string, unknown>;
  }): void {
    if (props.providerDisplayName !== undefined)
      this._providerDisplayName = props.providerDisplayName;
    if (props.providerAvatarUrl !== undefined) this._providerAvatarUrl = props.providerAvatarUrl;
    if (props.givenName !== undefined) this._givenName = props.givenName;
    if (props.familyName !== undefined) this._familyName = props.familyName;
    if (props.locale !== undefined) this._locale = props.locale;
    if (props.emailVerified !== undefined) this._emailVerified = props.emailVerified;
    if (props.jobTitle !== undefined) this._jobTitle = props.jobTitle;
    if (props.rawData !== undefined) this._rawData = props.rawData;
    this._syncedAt = new Date();
    this.touch();
  }
}
