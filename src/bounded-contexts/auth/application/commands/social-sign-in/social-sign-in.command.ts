export class SocialSignInCommand {
  constructor(
    public readonly email: string,
    public readonly displayName: string,
    public readonly provider: string,
    public readonly providerId: string,
  ) {}
}
