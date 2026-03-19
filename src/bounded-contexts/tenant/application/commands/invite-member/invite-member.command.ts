export class InviteMemberCommand {
  constructor(
    public readonly tenantId: number,
    public readonly tenantUUID: string,
    public readonly tenantName: string,
    public readonly inviterUserId: number,
    public readonly inviterRole: string,
    public readonly email: string,
    public readonly role: string,
  ) {}
}
