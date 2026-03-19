export class CompleteOnboardingCommand {
  constructor(
    public readonly userUUID: string,
    public readonly userEmail: string,
  ) {}
}
