import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class ForgotPasswordCommand {
  constructor(
    public readonly email: string,
    public readonly lang: Locale = 'es',
  ) {}
}
