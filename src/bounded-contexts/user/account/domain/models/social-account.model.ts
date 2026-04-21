import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { OAuthProviderVO } from '@user/domain/value-objects/oauth-provider.vo';

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
  private readonly _accountId: number;
  private readonly _provider: OAuthProviderVO;
  private readonly _providerId: string;
  private readonly _providerEmail: string | null;
  private readonly _linkedAt: Date;

  private constructor(props: SocialAccountCtorProps) {
    super(props);
    this._accountId = props.accountId;
    this._provider = new OAuthProviderVO(props.provider);
    this._providerId = props.providerId;
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

  get accountId(): number {
    return this._accountId;
  }

  get provider(): string {
    return this._provider.toString();
  }

  get providerId(): string {
    return this._providerId;
  }

  get providerEmail(): string | null {
    return this._providerEmail;
  }

  get linkedAt(): Date {
    return this._linkedAt;
  }
}
