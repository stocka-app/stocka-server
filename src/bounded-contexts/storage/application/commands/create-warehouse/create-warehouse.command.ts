export class CreateWarehouseCommand {
  constructor(
    public readonly tenantUUID: string,
    public readonly name: string,
    public readonly address: string,
    public readonly description?: string,
  ) {}
}
