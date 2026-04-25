import { BaseModel, BaseModelProps } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { MemberRoleVO } from '@tenant/domain/value-objects/member-role.vo';
import { MemberStatusVO } from '@tenant/domain/value-objects/member-status.vo';

export interface TenantMemberCreateProps {
  tenantId: number;
  userId: number;
  userUUID: string;
  role: string;
}

export interface TenantMemberReconstituteProps extends BaseModelProps {
  id: number;
  uuid: string;
  tenantId: number;
  userId: number;
  userUUID: string;
  role: string;
  status: string;
  invitedBy: number | null;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class TenantMemberModel extends BaseModel {
  protected _id: number | undefined;
  protected _uuid: UUIDVO;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _archivedAt: Date | null;

  private readonly _tenantId: number;
  private readonly _userId: number;
  private readonly _userUUID: UUIDVO;
  private _role: MemberRoleVO;
  private _status: MemberStatusVO;
  private readonly _invitedBy: number | null;
  private _joinedAt: Date | null;

  private constructor(
    props: BaseModelProps & {
      tenantId: number;
      userId: number;
      userUUID: UUIDVO;
      role: MemberRoleVO;
      status: MemberStatusVO;
      invitedBy: number | null;
      joinedAt: Date | null;
    },
  ) {
    super();
    this._id = props.id;
    this._uuid = new UUIDVO(props.uuid);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._archivedAt = props.archivedAt ?? null;
    this._tenantId = props.tenantId;
    this._userId = props.userId;
    this._userUUID = props.userUUID;
    this._role = props.role;
    this._status = props.status;
    this._invitedBy = props.invitedBy;
    this._joinedAt = props.joinedAt;
  }

  static create(props: TenantMemberCreateProps): TenantMemberModel {
    return new TenantMemberModel({
      tenantId: props.tenantId,
      userId: props.userId,
      userUUID: new UUIDVO(props.userUUID),
      role: MemberRoleVO.fromString(props.role),
      status: MemberStatusVO.active(),
      invitedBy: null,
      joinedAt: new Date(),
    });
  }

  static reconstitute(props: TenantMemberReconstituteProps): TenantMemberModel {
    return new TenantMemberModel({
      id: props.id,
      uuid: props.uuid,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
      tenantId: props.tenantId,
      userId: props.userId,
      userUUID: new UUIDVO(props.userUUID),
      role: MemberRoleVO.fromString(props.role),
      status: MemberStatusVO.fromString(props.status),
      invitedBy: props.invitedBy,
      joinedAt: props.joinedAt,
    });
  }

  get id(): number | undefined {
    return this._id;
  }

  get uuid(): UUIDVO {
    return this._uuid;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  get tenantId(): number {
    return this._tenantId;
  }

  get userId(): number {
    return this._userId;
  }

  get userUUID(): string {
    return this._userUUID.toString();
  }

  get role(): MemberRoleVO {
    return this._role;
  }

  get status(): MemberStatusVO {
    return this._status;
  }

  get invitedBy(): number | null {
    return this._invitedBy;
  }

  get joinedAt(): Date | null {
    return this._joinedAt;
  }

  isOwner(): boolean {
    return this._role.isOwner();
  }

  isActive(): boolean {
    return this._status.isActive();
  }
}
