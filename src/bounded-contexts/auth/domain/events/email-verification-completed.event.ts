import { IEvent } from '@nestjs/cqrs';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class EmailVerificationCompletedEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly lang: Locale = 'es',
    public readonly occurredOn: Date = new Date(),
  ) {}
}
