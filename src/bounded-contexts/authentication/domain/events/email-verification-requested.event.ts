import { DomainEvent } from '@shared/domain/base/domain-event';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class EmailVerificationRequestedEvent extends DomainEvent {
  constructor(
    public readonly credentialAccountId: number,
    public readonly email: string,
    public readonly code: string,
    public readonly userName: string = '',
    public readonly lang: Locale = 'es',
  ) {
    super();
  }
}
