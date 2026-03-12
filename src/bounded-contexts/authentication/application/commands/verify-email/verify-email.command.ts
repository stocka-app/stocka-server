import { ICommand } from '@nestjs/cqrs';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class VerifyEmailCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
    public readonly lang: Locale = 'es',
  ) {}
}
