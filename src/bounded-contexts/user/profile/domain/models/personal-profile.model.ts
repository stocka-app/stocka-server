import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { UsernameVO } from '@user/domain/value-objects/username.vo';
import { DisplayNameVO } from '@shared/domain/value-objects/display-name.vo';
import { AvatarUrlVO } from '@shared/domain/value-objects/avatar-url.vo';

export interface PersonalProfileReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  profileId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class PersonalProfileModel extends BaseModel {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _profileId: number;
  private _username: UsernameVO;
  private _displayName: DisplayNameVO | null;
  private _avatarUrl: AvatarUrlVO | null;
  private _locale: string;
  private _timezone: string;

  private constructor(props: PersonalProfileReconstitueProps) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._profileId = props.profileId;
    this._username = new UsernameVO(props.username);
    this._displayName = props.displayName !== null ? DisplayNameVO.create(props.displayName) : null;
    this._avatarUrl = props.avatarUrl !== null ? AvatarUrlVO.create(props.avatarUrl) : null;
    this._locale = props.locale;
    this._timezone = props.timezone;
  }

  static create(props: {
    profileId: number;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    locale?: string;
    timezone?: string;
  }): PersonalProfileModel {
    return new PersonalProfileModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      profileId: props.profileId,
      username: props.username,
      displayName: props.displayName ?? null,
      avatarUrl: props.avatarUrl ?? null,
      locale: props.locale ?? 'es',
      timezone: props.timezone ?? 'America/Mexico_City',
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: PersonalProfileReconstitueProps): PersonalProfileModel {
    return new PersonalProfileModel(props);
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

  get username(): string {
    return this._username.getValue();
  }

  get displayName(): DisplayNameVO | null {
    return this._displayName;
  }

  get avatarUrl(): AvatarUrlVO | null {
    return this._avatarUrl;
  }

  get locale(): string {
    return this._locale;
  }

  get timezone(): string {
    return this._timezone;
  }

  updateLocale(locale: string): void {
    this._locale = locale;
    this.touch();
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }
}
