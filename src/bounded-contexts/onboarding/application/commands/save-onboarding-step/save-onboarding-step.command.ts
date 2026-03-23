export class SaveOnboardingStepCommand {
  constructor(
    public readonly userUUID: string,
    public readonly section: string,
    public readonly data: Record<string, unknown>,
    public readonly currentStep?: number,
  ) {}
}
