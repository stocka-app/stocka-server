import { EmailVO } from '@shared/domain/value-objects/compound/email.vo';
import { MemberRoleVO } from '@tenant/domain/value-objects/member-role.vo';
import { TenantNameVO } from '@tenant/domain/value-objects/tenant-name.vo';
import { InvitationTokenVO } from '@tenant/domain/value-objects/invitation-token.vo';

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

export interface CreateTenantInvitationProps {
  tenantId: number;
  tenantUUID: string;
  tenantName: string;
  invitedBy: number;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
}

export class TenantInvitationModel {
  private readonly _email: EmailVO;
  private readonly _role: MemberRoleVO;
  private readonly _tenantName: TenantNameVO;
  private readonly _token: InvitationTokenVO;

  private constructor(private readonly props: TenantInvitationReconstituteProps) {
    this._email = new EmailVO(props.email);
    this._role = MemberRoleVO.fromString(props.role);
    this._tenantName = new TenantNameVO(props.tenantName);
    this._token = new InvitationTokenVO(props.token);
  }

  static reconstitute(props: TenantInvitationReconstituteProps): TenantInvitationModel {
    return new TenantInvitationModel(props);
  }

  static create(props: CreateTenantInvitationProps): TenantInvitationModel {
    return TenantInvitationModel.reconstitute({
      id: '',
      ...props,
      acceptedAt: null,
      createdAt: new Date(),
    });
  }

  isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }

  isAlreadyAccepted(): boolean {
    return this.props.acceptedAt !== null;
  }

  emailMatches(email: string): boolean {
    return this._email.toString().toLowerCase() === email.toLowerCase();
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

  get tenantName(): TenantNameVO {
    return this._tenantName;
  }

  get invitedBy(): number {
    return this.props.invitedBy;
  }

  get email(): string {
    return this._email.toString();
  }

  get role(): string {
    return this._role.toString();
  }

  get token(): InvitationTokenVO {
    return this._token;
  }

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
