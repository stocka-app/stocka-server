import { DomainEvent } from '@shared/domain/base/domain-event';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class EmailVerificationCompletedEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly lang: Locale = 'es',
  ) {
    super();
  }
}
