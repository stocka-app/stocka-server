export class VerifyEmailCommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
  ) {}
}
