export class LinkProviderToUserCommand {
  constructor(
    public readonly userId: number,
    public readonly provider: string,
    public readonly providerId: string,
  ) {}
}
