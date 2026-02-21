export class SetPasswordForSocialUserCommand {
  constructor(
    public readonly userId: number,
    public readonly passwordHash: string,
  ) {}
}
