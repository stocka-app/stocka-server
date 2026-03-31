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

export class SocialSessionModel extends BaseModel {
  private readonly _sessionId: number;
  private readonly _socialAccountId: number;
  private readonly _provider: string;

  private constructor(props: SocialSessionReconstitueProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._sessionId = props.sessionId;
    this._socialAccountId = props.socialAccountId;
    this._provider = props.provider;
  }

  static create(props: { socialAccountId: number; provider: string }): SocialSessionModel {
    return new SocialSessionModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      sessionId: undefined as unknown as number,
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

  get sessionId(): number {
    return this._sessionId;
  }

  get socialAccountId(): number {
    return this._socialAccountId;
  }

  get provider(): string {
    return this._provider;
  }
}
