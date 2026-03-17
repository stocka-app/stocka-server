export class CreateTenantCommand {
  constructor(
    public readonly userUUID: string,
    public readonly name: string,
    public readonly businessType: string,
    public readonly country: string,
    public readonly timezone: string,
  ) {}
}
