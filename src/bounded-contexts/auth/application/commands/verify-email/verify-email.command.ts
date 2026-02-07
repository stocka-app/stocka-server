export class VerifyEmailCommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
  ) {}
}
