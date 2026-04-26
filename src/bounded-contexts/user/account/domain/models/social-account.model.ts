import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { OAuthProviderVO } from '@user/domain/value-objects/oauth-provider.vo';
import { ProviderIdVO } from '@user/account/domain/value-objects/provider-id.vo';

export interface SocialAccountReconstitueProps extends BaseModelProps {
  id: number;
  uuid: string;
  accountId: number;
  provider: string;
  providerId: string;
  providerEmail: string | null;
  linkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

/** Internal constructor props — DB-assigned fields are optional for new models. */
interface SocialAccountCtorProps extends BaseModelProps {
  accountId: number;
  provider: string;
  providerId: string;
  providerEmail: string | null;
  linkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class SocialAccountModel extends BaseModel {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _accountId: number;
  private readonly _provider: OAuthProviderVO;
  private readonly _providerId: ProviderIdVO;
  private readonly _providerEmail: string | null;
  private readonly _linkedAt: Date;

  private constructor(props: SocialAccountCtorProps) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._accountId = props.accountId;
    this._provider = new OAuthProviderVO(props.provider);
    this._providerId = ProviderIdVO.create(props.providerId);
    this._providerEmail = props.providerEmail;
    this._linkedAt = props.linkedAt;
  }

  static create(props: {
    accountId: number;
    provider: string;
    providerId: string;
    providerEmail?: string | null;
  }): SocialAccountModel {
    return new SocialAccountModel({
      accountId: props.accountId,
      provider: props.provider,
      providerId: props.providerId,
      providerEmail: props.providerEmail ?? null,
      linkedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
  }

  static reconstitute(props: SocialAccountReconstitueProps): SocialAccountModel {
    return new SocialAccountModel(props);
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

  get accountId(): number {
    return this._accountId;
  }

  get provider(): string {
    return this._provider.toString();
  }

  get providerId(): ProviderIdVO {
    return this._providerId;
  }

  get providerEmail(): string | null {
    return this._providerEmail;
  }

  get linkedAt(): Date {
    return this._linkedAt;
  }
}
