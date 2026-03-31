import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';

export interface CredentialSessionReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  sessionId: number;
  credentialAccountId: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class CredentialSessionModel extends BaseModel {
  private readonly _sessionId: number;
  private readonly _credentialAccountId: number;

  private constructor(props: CredentialSessionReconstitueProps) {
    super({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
    this._sessionId = props.sessionId;
    this._credentialAccountId = props.credentialAccountId;
  }

  static create(props: { credentialAccountId: number }): CredentialSessionModel {
    return new CredentialSessionModel({
      id: undefined as unknown as number,
      uuid: undefined as unknown as string,
      sessionId: undefined as unknown as number,
      credentialAccountId: props.credentialAccountId,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: CredentialSessionReconstitueProps): CredentialSessionModel {
    return new CredentialSessionModel(props);
  }

  get sessionId(): number {
    return this._sessionId;
  }

  get credentialAccountId(): number {
    return this._credentialAccountId;
  }
}
