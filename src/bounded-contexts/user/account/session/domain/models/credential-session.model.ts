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

/** Internal constructor props — DB-assigned fields are optional for new models. */
interface CredentialSessionCtorProps extends BaseModelProps {
  sessionId?: number;
  credentialAccountId: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class CredentialSessionModel extends BaseModel {
  private readonly _sessionId: number | undefined;
  private readonly _credentialAccountId: number;

  private constructor(props: CredentialSessionCtorProps) {
    super(props);
    this._sessionId = props.sessionId;
    this._credentialAccountId = props.credentialAccountId;
  }

  static create(props: { credentialAccountId: number }): CredentialSessionModel {
    return new CredentialSessionModel({
      credentialAccountId: props.credentialAccountId,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: CredentialSessionReconstitueProps): CredentialSessionModel {
    return new CredentialSessionModel(props);
  }

  /** Defined after DB persist — undefined on newly-created (pre-persist) models. */
  get sessionId(): number | undefined {
    return this._sessionId;
  }

  get credentialAccountId(): number {
    return this._credentialAccountId;
  }
}
