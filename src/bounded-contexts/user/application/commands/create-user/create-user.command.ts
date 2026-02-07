export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly passwordHash: string,
  ) {}
}
