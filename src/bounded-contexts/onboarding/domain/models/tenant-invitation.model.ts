export interface TenantInvitationReconstituteProps {
  id: string;
  tenantId: number;
  tenantUUID: string;
  tenantName: string;
  invitedBy: number;
  email: string;
  role: string;
  token: string;
  acceptedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export class TenantInvitationModel {
  private constructor(private readonly props: TenantInvitationReconstituteProps) {}

  static reconstitute(props: TenantInvitationReconstituteProps): TenantInvitationModel {
    return new TenantInvitationModel(props);
  }

  isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }

  isAlreadyAccepted(): boolean {
    return this.props.acceptedAt !== null;
  }

  emailMatches(email: string): boolean {
    return this.props.email.toLowerCase() === email.toLowerCase();
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): number {
    return this.props.tenantId;
  }

  get tenantUUID(): string {
    return this.props.tenantUUID;
  }

  get tenantName(): string {
    return this.props.tenantName;
  }

  get invitedBy(): number {
    return this.props.invitedBy;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): string {
    return this.props.role;
  }

  get token(): string {
    return this.props.token;
  }

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }
}
