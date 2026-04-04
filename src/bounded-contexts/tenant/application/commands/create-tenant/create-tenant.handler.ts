import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantProfileContract } from '@tenant/domain/contracts/tenant-profile.contract';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { SlugVO } from '@tenant/domain/value-objects/slug.vo';
import { BusinessTypeVO } from '@tenant/domain/value-objects/business-type.vo';
import { OnboardingAlreadyCompletedError } from '@tenant/domain/errors/onboarding-already-completed.error';
import { TenantOwnerNotFoundError } from '@tenant/domain/errors/tenant-owner-not-found.error';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';
import { v7 as uuidV7 } from 'uuid';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { CreateTenantResult } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding-out.dto';

@CommandHandler(CreateTenantCommand)
export class CreateTenantHandler implements ICommandHandler<CreateTenantCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_CONTRACT)
    private readonly tenantContract: ITenantContract,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.TENANT_PROFILE_CONTRACT)
    private readonly profileContract: ITenantProfileContract,
    @Inject(INJECTION_TOKENS.TENANT_CONFIG_CONTRACT)
    private readonly configContract: ITenantConfigContract,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
    private readonly eventPublisher: EventPublisher,
    private readonly mediator: MediatorService,
  ) {}

  async execute(command: CreateTenantCommand): Promise<CreateTenantResult> {
    const userAggregate = await this.mediator.user.findByUUID(command.userUUID);

    /* istanbul ignore next — JWT SecurityGuard ensures the user exists before the command handler runs */
    if (!userAggregate) {
      return err(new TenantOwnerNotFoundError(command.userUUID));
    }

    const existingMember = await this.memberContract.findActiveByUserUUID(command.userUUID);
    if (existingMember) {
      return err(new OnboardingAlreadyCompletedError());
    }

    const slug = SlugVO.fromName(command.name);
    const businessType = BusinessTypeVO.fromString(command.businessType);

    const existingBySlug = await this.tenantContract.findBySlug(slug.toString());
    const finalSlug = existingBySlug
      ? SlugVO.fromString(`${slug.toString()}-${uuidV7().substring(0, 8)}`)
      : slug;

    const tenant = TenantAggregate.create({
      name: command.name,
      slug: finalSlug,
      businessType,
      country: command.country,
      timezone: command.timezone,
      ownerUserId: userAggregate.id,
    });

    const ownerUserId = userAggregate.id;

    const savedTenant = await this.uow.execute(async () => {
      const persisted = await this.tenantContract.persist(tenant);
      const tenantId = persisted.id;

      await this.memberContract.persist(
        TenantMemberModel.create({
          tenantId,
          userId: ownerUserId,
          userUUID: command.userUUID,
          role: 'OWNER',
        }),
      );

      await this.profileContract.persist(TenantProfileModel.createEmpty(tenantId));
      await this.configContract.persist(TenantConfigModel.createFreeDefaults(tenantId));

      return persisted;
    });

    this.eventPublisher.mergeObjectContext(savedTenant);
    savedTenant.commit();

    return ok({ tenantId: savedTenant.uuid, name: savedTenant.name });
  }
}
