import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITenantInvitationContract } from '@onboarding/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@onboarding/domain/models/tenant-invitation.model';
import { TenantInvitationEntity } from '@onboarding/infrastructure/entities/tenant-invitation.entity';

@Injectable()
export class TypeOrmTenantInvitationRepository implements ITenantInvitationContract {
  constructor(
    @InjectRepository(TenantInvitationEntity)
    private readonly repo: Repository<TenantInvitationEntity>,
  ) {}

  async findByToken(token: string): Promise<TenantInvitationModel | null> {
    const entity = await this.repo.findOne({ where: { token } });
    if (!entity) return null;
    return TenantInvitationModel.reconstitute({
      id: entity.id,
      tenantId: entity.tenantId,
      tenantUUID: entity.tenantUUID,
      tenantName: entity.tenantName,
      invitedBy: entity.invitedBy,
      email: entity.email,
      role: entity.role,
      token: entity.token,
      acceptedAt: entity.acceptedAt,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    });
  }

  async markAccepted(id: string): Promise<void> {
    await this.repo.update({ id }, { acceptedAt: new Date() });
  }
}
