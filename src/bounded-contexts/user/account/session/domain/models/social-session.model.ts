import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';

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
  private readonly _sessionId: number | undefined;
  private readonly _socialAccountId: number;
  private readonly _provider: string;

  private constructor(props: SocialSessionCtorProps) {
    super(props);
    this._sessionId = props.sessionId;
    this._socialAccountId = props.socialAccountId;
    this._provider = props.provider;
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

  /** Defined after DB persist — undefined on newly-created (pre-persist) models. */
  get sessionId(): number | undefined {
    return this._sessionId;
  }

  get socialAccountId(): number {
    return this._socialAccountId;
  }

  get provider(): string {
    return this._provider;
  }
}
