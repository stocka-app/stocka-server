import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class SignUpCommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly lang: Locale = 'es',
  ) {}
}
