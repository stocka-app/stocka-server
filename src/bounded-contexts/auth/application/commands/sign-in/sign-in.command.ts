export class SignInCommand {
  constructor(
    public readonly emailOrUsername: string,
    public readonly password: string,
  ) {}
}
