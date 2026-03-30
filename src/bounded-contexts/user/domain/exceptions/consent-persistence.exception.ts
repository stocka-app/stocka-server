import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class ConsentPersistenceException extends DomainException {
  constructor(detail: string) {
    super('Failed to persist user consents', 'CONSENT_PERSISTENCE_ERROR', [
      { field: 'consents', message: detail },
    ]);
  }
}
