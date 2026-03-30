import { DomainEvent } from '@shared/domain/base/domain-event';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class PasswordResetRequestedEvent extends DomainEvent {
  constructor(
    public readonly credentialAccountId: number,
    public readonly email: string,
    public readonly token: string,
    public readonly lang: Locale = 'es',
    public readonly isSocialAccount: boolean = false,
    public readonly provider: string | null = null,
  ) {
    super();
  }
}
