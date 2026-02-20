import { IEvent } from '@nestjs/cqrs';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class PasswordResetRequestedEvent implements IEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly token: string,
    public readonly lang: Locale = 'es',
    public readonly occurredOn: Date = new Date(),
  ) {}
}
