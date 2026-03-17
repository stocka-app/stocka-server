export class TenantCreatedEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly ownerUserUUID: string,
    public readonly name: string,
    public readonly slug: string,
  ) {}
}
