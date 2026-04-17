import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidOAuthProviderException extends DomainException {
  constructor(value: string) {
    super(`Invalid OAuth provider: ${value}`, 'INVALID_OAUTH_PROVIDER', [
      { field: 'createdWith', message: `Invalid OAuth provider: ${value}` },
    ]);
  }
}
