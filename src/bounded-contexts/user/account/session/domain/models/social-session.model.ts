import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { OAuthProviderVO } from '@user/domain/value-objects/oauth-provider.vo';

export interface SocialSessionReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  sessionId: number;
  socialAccountId: number;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

/** Internal constructor props — DB-assigned fields are optional for new models. */
interface SocialSessionCtorProps extends BaseModelProps {
  sessionId?: number;
  socialAccountId: number;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class SocialSessionModel extends BaseModel {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _sessionId: number | undefined;
  private readonly _socialAccountId: number;
  private readonly _provider: OAuthProviderVO;

  private constructor(props: SocialSessionCtorProps) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._sessionId = props.sessionId;
    this._socialAccountId = props.socialAccountId;
    this._provider = new OAuthProviderVO(props.provider);
  }

  static create(props: { socialAccountId: number; provider: string }): SocialSessionModel {
    return new SocialSessionModel({
      socialAccountId: props.socialAccountId,
      provider: props.provider,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: SocialSessionReconstitueProps): SocialSessionModel {
    return new SocialSessionModel(props);
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

  /** Defined after DB persist — undefined on newly-created (pre-persist) models. */
  get sessionId(): number | undefined {
    return this._sessionId;
  }

  get socialAccountId(): number {
    return this._socialAccountId;
  }

  get provider(): string {
    return this._provider.toString();
  }
}
