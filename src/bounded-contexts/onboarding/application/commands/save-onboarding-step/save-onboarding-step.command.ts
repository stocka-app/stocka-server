export class SaveOnboardingStepCommand {
  constructor(
    public readonly userUUID: string,
    public readonly step: number,
    public readonly data: Record<string, unknown>,
  ) {}
}
