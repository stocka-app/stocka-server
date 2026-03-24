import { ICommand } from '@nestjs/cqrs';

export class SocialSignInCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly displayName: string,
    public readonly provider: string,
    public readonly providerId: string,
    public readonly givenName: string | null,
    public readonly familyName: string | null,
    public readonly avatarUrl: string | null,
    public readonly locale: string | null,
    public readonly emailVerified: boolean,
    public readonly jobTitle: string | null,
    public readonly rawData: Record<string, unknown>,
  ) {}
}
