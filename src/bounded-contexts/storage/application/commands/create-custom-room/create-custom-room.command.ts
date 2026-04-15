export class CreateCustomRoomCommand {
  constructor(
    public readonly tenantUUID: string,
    public readonly name: string,
    public readonly roomType: string,
    public readonly address: string | null | undefined,
    public readonly actorUUID: string,
    public readonly description?: string,
    public readonly icon?: string,
    public readonly color?: string,
  ) {}
}
