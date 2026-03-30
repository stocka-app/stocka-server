import { DomainEvent } from '@shared/domain/base/domain-event';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class VerificationCodeResentEvent extends DomainEvent {
  constructor(
    public readonly credentialAccountId: number,
    public readonly email: string,
    public readonly code: string,
    public readonly resendCount: number,
    public readonly lang: Locale = 'es',
  ) {
    super();
  }
}
