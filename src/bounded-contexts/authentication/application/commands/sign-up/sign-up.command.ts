import { ICommand } from '@nestjs/cqrs';
import type { Locale } from '@shared/infrastructure/i18n/locale.helper';

export class SignUpCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly lang: Locale = 'es',
  ) {}
}
