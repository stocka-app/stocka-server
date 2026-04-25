import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { OAuthProviderVO } from '@user/domain/value-objects/oauth-provider.vo';
import { AvatarUrlVO } from '@shared/domain/value-objects/avatar-url.vo';
import { GivenNameVO } from '@user/profile/domain/value-objects/given-name.vo';
import { FamilyNameVO } from '@user/profile/domain/value-objects/family-name.vo';
import { JobTitleVO } from '@user/profile/domain/value-objects/job-title.vo';
import { ProviderDisplayNameVO } from '@user/profile/domain/value-objects/provider-display-name.vo';
import { ProviderProfileUrlVO } from '@user/profile/domain/value-objects/provider-profile-url.vo';

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
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _profileId: number;
  private _socialAccountUUID: UUIDVO;
  private _provider: OAuthProviderVO;
  private _providerDisplayName: ProviderDisplayNameVO | null;
  private _providerAvatarUrl: AvatarUrlVO | null;
  private _providerProfileUrl: ProviderProfileUrlVO | null;
  private _givenName: GivenNameVO | null;
  private _familyName: FamilyNameVO | null;
  private _locale: string | null;
  private _emailVerified: boolean;
  private _jobTitle: JobTitleVO | null;
  private _rawData: Record<string, unknown>;
  private _syncedAt: Date;

  private constructor(props: SocialProfileReconstitueProps) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._profileId = props.profileId;
    this._socialAccountUUID = new UUIDVO(props.socialAccountUUID);
    this._provider = new OAuthProviderVO(props.provider);
    this._providerDisplayName =
      props.providerDisplayName !== null
        ? ProviderDisplayNameVO.create(props.providerDisplayName)
        : null;
    this._providerAvatarUrl =
      props.providerAvatarUrl !== null ? AvatarUrlVO.create(props.providerAvatarUrl) : null;
    this._providerProfileUrl =
      props.providerProfileUrl !== null
        ? ProviderProfileUrlVO.create(props.providerProfileUrl)
        : null;
    this._givenName = props.givenName !== null ? GivenNameVO.create(props.givenName) : null;
    this._familyName = props.familyName !== null ? FamilyNameVO.create(props.familyName) : null;
    this._locale = props.locale;
    this._emailVerified = props.emailVerified;
    this._jobTitle = props.jobTitle !== null ? JobTitleVO.create(props.jobTitle) : null;
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

  get id(): number | undefined {
    return this._id;
  }

  get uuid(): UUIDVO {
    return this._uuid;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  get profileId(): number {
    return this._profileId;
  }

  get socialAccountUUID(): UUIDVO {
    return this._socialAccountUUID;
  }

  get provider(): string {
    return this._provider.toString();
  }

  get providerDisplayName(): ProviderDisplayNameVO | null {
    return this._providerDisplayName;
  }

  get providerAvatarUrl(): AvatarUrlVO | null {
    return this._providerAvatarUrl;
  }

  get providerProfileUrl(): ProviderProfileUrlVO | null {
    return this._providerProfileUrl;
  }

  get givenName(): GivenNameVO | null {
    return this._givenName;
  }

  get familyName(): FamilyNameVO | null {
    return this._familyName;
  }

  get locale(): string | null {
    return this._locale;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get jobTitle(): JobTitleVO | null {
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
      this._providerDisplayName =
        props.providerDisplayName !== null
          ? ProviderDisplayNameVO.create(props.providerDisplayName)
          : null;
    if (props.providerAvatarUrl !== undefined)
      this._providerAvatarUrl =
        props.providerAvatarUrl !== null ? AvatarUrlVO.create(props.providerAvatarUrl) : null;
    if (props.givenName !== undefined)
      this._givenName = props.givenName !== null ? GivenNameVO.create(props.givenName) : null;
    if (props.familyName !== undefined)
      this._familyName = props.familyName !== null ? FamilyNameVO.create(props.familyName) : null;
    if (props.locale !== undefined) this._locale = props.locale;
    if (props.emailVerified !== undefined) this._emailVerified = props.emailVerified;
    if (props.jobTitle !== undefined)
      this._jobTitle = props.jobTitle !== null ? JobTitleVO.create(props.jobTitle) : null;
    if (props.rawData !== undefined) this._rawData = props.rawData;
    this._syncedAt = new Date();
    this.touch();
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }
}
