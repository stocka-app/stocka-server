import { ICommand } from '@nestjs/cqrs';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class ResendVerificationCodeCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
    public readonly lang: Locale = 'es',
  ) {}
}
