export class MemberAddedEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly userUUID: string,
    public readonly role: string,
  ) {}
}
