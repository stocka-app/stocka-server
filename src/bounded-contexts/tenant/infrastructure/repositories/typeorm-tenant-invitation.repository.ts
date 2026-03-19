import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import {
  ITenantInvitationContract,
  CreateInvitationProps,
} from '@tenant/domain/contracts/tenant-invitation.contract';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { TenantInvitationEntity } from '@tenant/infrastructure/entities/tenant-invitation.entity';

@Injectable()
export class TypeOrmTenantInvitationRepository implements ITenantInvitationContract {
  constructor(
    @InjectRepository(TenantInvitationEntity)
    private readonly repo: Repository<TenantInvitationEntity>,
  ) {}

  async findByToken(token: string): Promise<TenantInvitationModel | null> {
    const entity = await this.repo.findOne({ where: { token } });
    return entity ? this.toModel(entity) : null;
  }

  async findById(id: string): Promise<TenantInvitationModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toModel(entity) : null;
  }

  async findPendingByEmail(tenantId: number, email: string): Promise<TenantInvitationModel | null> {
    const entity = await this.repo.findOne({
      where: {
        tenantId,
        email,
        acceptedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    return entity ? this.toModel(entity) : null;
  }

  async findAllByTenantId(tenantId: number): Promise<TenantInvitationModel[]> {
    const entities = await this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toModel(e));
  }

  async create(props: CreateInvitationProps): Promise<TenantInvitationModel> {
    const entity = this.repo.create({
      tenantId: props.tenantId,
      tenantUUID: props.tenantUUID,
      tenantName: props.tenantName,
      invitedBy: props.invitedBy,
      email: props.email,
      role: props.role,
      token: props.token,
      expiresAt: props.expiresAt,
      acceptedAt: null,
    });
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async markAccepted(id: string): Promise<void> {
    await this.repo.update({ id }, { acceptedAt: new Date() });
  }

  async cancel(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toModel(entity: TenantInvitationEntity): TenantInvitationModel {
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
}
