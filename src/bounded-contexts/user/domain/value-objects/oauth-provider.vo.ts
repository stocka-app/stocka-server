import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

class InvalidOAuthProviderException extends DomainException {
  constructor(value: string) {
    super(`Invalid OAuth provider: ${value}`, 'INVALID_OAUTH_PROVIDER', [
      { field: 'createdWith', message: `Invalid OAuth provider: ${value}` },
    ]);
  }
}

export enum OAuthProviderEnum {
  LOCAL = 'email',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  MICROSOFT = 'microsoft',
  APPLE = 'apple',
}

export class OAuthProviderVO extends CompoundVO {
  private static readonly VALID_PROVIDERS = Object.values(OAuthProviderEnum);

  private readonly _value: OAuthProviderEnum;

  constructor(value: string) {
    super();
    this._value = value as OAuthProviderEnum;
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!OAuthProviderVO.VALID_PROVIDERS.includes(this._value)) {
      throw new InvalidOAuthProviderException(this._value);
    }
  }

  toString(): string {
    return this._value;
  }

  equals(other: OAuthProviderVO): boolean {
    if (!(other instanceof OAuthProviderVO)) {
      return false;
    }
    return this._value === other._value;
  }

  isLocal(): boolean {
    return this._value === OAuthProviderEnum.LOCAL;
  }

  isSocial(): boolean {
    return this._value !== OAuthProviderEnum.LOCAL;
  }

  static local(): OAuthProviderVO {
    return new OAuthProviderVO(OAuthProviderEnum.LOCAL);
  }

  static google(): OAuthProviderVO {
    return new OAuthProviderVO(OAuthProviderEnum.GOOGLE);
  }

  static facebook(): OAuthProviderVO {
    return new OAuthProviderVO(OAuthProviderEnum.FACEBOOK);
  }

  static microsoft(): OAuthProviderVO {
    return new OAuthProviderVO(OAuthProviderEnum.MICROSOFT);
  }
}
