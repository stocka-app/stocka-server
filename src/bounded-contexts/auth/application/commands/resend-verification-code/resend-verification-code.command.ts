export class ResendVerificationCodeCommand {
  constructor(
    public readonly email: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
  ) {}
}
