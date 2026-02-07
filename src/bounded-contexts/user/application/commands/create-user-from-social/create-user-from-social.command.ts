export class CreateUserFromSocialCommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly provider: string,
    public readonly providerId: string,
  ) {}
}
