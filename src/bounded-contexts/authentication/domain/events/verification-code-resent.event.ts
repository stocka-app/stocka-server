import { IEvent } from '@nestjs/cqrs';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class VerificationCodeResentEvent implements IEvent {
  constructor(
    public readonly credentialAccountId: number,
    public readonly email: string,
    public readonly code: string,
    public readonly resendCount: number,
    public readonly lang: Locale = 'es',
    public readonly occurredOn: Date = new Date(),
  ) {}
}
