export class UpdateCustomRoomCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly name?: string,
    public readonly description?: string | null,
    public readonly icon?: string,
    public readonly color?: string,
    public readonly address?: string | null,
    public readonly roomType?: string,
  ) {}
}
