import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';

export class TenantMemberMapper {
  static toDomain(entity: TenantMemberEntity): TenantMemberModel {
    return TenantMemberModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      tenantId: entity.tenantId,
      userId: entity.userId,
      userUUID: entity.userUUID,
      role: entity.role,
      status: entity.status,
      invitedBy: entity.invitedBy,
      joinedAt: entity.joinedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: TenantMemberModel): Partial<TenantMemberEntity> {
    const entity: Partial<TenantMemberEntity> = {
      uuid: model.uuid.toString(),
      tenantId: model.tenantId,
      userId: model.userId,
      userUUID: model.userUUID,
      role: model.role.toString(),
      status: model.status.toString(),
      invitedBy: model.invitedBy,
      joinedAt: model.joinedAt,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}
