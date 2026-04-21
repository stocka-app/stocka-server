import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UsernameVO } from '@user/domain/value-objects/username.vo';

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
  private readonly _profileId: number;
  private _username: UsernameVO;
  private _displayName: string | null;
  private _avatarUrl: string | null;
  private _locale: string;
  private _timezone: string;

  private constructor(props: PersonalProfileReconstitueProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._profileId = props.profileId;
    this._username = new UsernameVO(props.username);
    this._displayName = props.displayName;
    this._avatarUrl = props.avatarUrl;
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

  get profileId(): number {
    return this._profileId;
  }

  get username(): string {
    return this._username.getValue();
  }

  get displayName(): string | null {
    return this._displayName;
  }

  get avatarUrl(): string | null {
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
}
