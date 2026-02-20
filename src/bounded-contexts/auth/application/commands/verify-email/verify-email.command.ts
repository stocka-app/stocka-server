import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class VerifyEmailCommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
    public readonly lang: Locale = 'es',
  ) {}
}
