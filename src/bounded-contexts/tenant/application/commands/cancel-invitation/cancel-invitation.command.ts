export class CancelInvitationCommand {
  constructor(
    public readonly invitationId: string,
    public readonly tenantId: number,
    public readonly requestingUserId: number,
    public readonly requestingRole: string,
  ) {}
}
