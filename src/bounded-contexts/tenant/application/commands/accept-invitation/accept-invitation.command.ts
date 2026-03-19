export class AcceptInvitationCommand {
  constructor(
    public readonly token: string,
    public readonly userUUID: string,
    public readonly userEmail: string,
  ) {}
}
