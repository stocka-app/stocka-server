import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

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
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _sessionId: number | undefined;
  private readonly _credentialAccountId: number;

  private constructor(props: CredentialSessionCtorProps) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
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

  get credentialAccountId(): number {
    return this._credentialAccountId;
  }
}
