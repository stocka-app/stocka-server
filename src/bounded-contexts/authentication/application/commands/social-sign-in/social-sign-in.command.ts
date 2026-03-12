import { ICommand } from '@nestjs/cqrs';

export class SocialSignInCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly displayName: string,
    public readonly provider: string,
    public readonly providerId: string,
  ) {}
}
