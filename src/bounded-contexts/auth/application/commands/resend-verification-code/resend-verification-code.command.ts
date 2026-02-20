import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class ResendVerificationCodeCommand {
  constructor(
    public readonly email: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
    public readonly lang: Locale = 'es',
  ) {}
}
