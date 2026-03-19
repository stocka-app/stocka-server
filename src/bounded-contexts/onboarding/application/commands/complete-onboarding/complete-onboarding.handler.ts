import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CompleteOnboardingCommand } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { ITenantInvitationContract } from '@onboarding/domain/contracts/tenant-invitation.contract';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';
import { OnboardingIncompleteError } from '@onboarding/domain/errors/onboarding-incomplete.error';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { InvitationEmailMismatchError } from '@onboarding/domain/errors/invitation-email-mismatch.error';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { CreateStorageCommand } from '@storage/application/commands/create-storage/create-storage.command';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { CreateTenantResult, CreateTenantErrors } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding-out.dto';
import { CreateStorageResult } from '@storage/application/commands/create-storage/create-storage.handler';

export interface CompleteOnboardingData {
  path: OnboardingPath;
  tenantId: string | null;
  tenantName: string | null;
  role: string | null;
}

export type CompleteOnboardingResult = Result<CompleteOnboardingData, DomainException>;

function defaultStorageName(businessType: string): string {
  switch (businessType) {
    case 'retail':
    case 'wholesale':
      return 'Tienda Principal';
    case 'food':
      return 'Cocina / Preparación';
    case 'healthcare':
      return 'Consultorio Principal';
    case 'manufacturing':
      return 'Taller Principal';
    default:
      return 'Espacio Principal';
  }
}

@CommandHandler(CompleteOnboardingCommand)
export class CompleteOnboardingHandler implements ICommandHandler<CompleteOnboardingCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.ONBOARDING_SESSION_CONTRACT)
    private readonly sessionContract: IOnboardingSessionContract,
    @Inject(INJECTION_TOKENS.TENANT_INVITATION_CONTRACT)
    private readonly invitationContract: ITenantInvitationContract,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.TENANT_CONTRACT)
    private readonly tenantContract: ITenantContract,
    private readonly commandBus: CommandBus,
    private readonly mediator: MediatorService,
  ) {}

  async execute(command: CompleteOnboardingCommand): Promise<CompleteOnboardingResult> {
    const session = await this.sessionContract.findByUserUUID(command.userUUID);
    if (!session) {
      return err(new OnboardingNotFoundError());
    }
    if (session.isCompleted()) {
      return err(new OnboardingAlreadyCompletedError());
    }

    if (session.path === null) {
      return err(new OnboardingIncompleteError('step 0 (path selection)'));
    }

    if (session.path === OnboardingPath.JOIN) {
      return this.handleJoinPath(command, session.invitationCode);
    }

    return this.handleCreatePath(command, session);
  }

  private async handleCreatePath(
    command: CompleteOnboardingCommand,
    session: import('@onboarding/domain/models/onboarding-session.model').OnboardingSessionModel,
  ): Promise<CompleteOnboardingResult> {
    const step3 = session.getStepData(3) as {
      name?: string;
      businessType?: string;
      country?: string;
      timezone?: string;
    } | null;

    if (!step3?.name || !step3.businessType || !step3.country || !step3.timezone) {
      return err(new OnboardingIncompleteError('step 3 (business profile)'));
    }

    const createTenantResult = await this.commandBus.execute<CreateTenantCommand, CreateTenantResult>(
      new CreateTenantCommand(
        command.userUUID,
        step3.name,
        step3.businessType,
        step3.country,
        step3.timezone,
      ),
    );

    if (createTenantResult.isErr()) {
      const tenantError: CreateTenantErrors = createTenantResult.error;
      if (tenantError instanceof DomainException) {
        return err(tenantError);
      }
      throw tenantError;
    }

    const { tenantId, name } = createTenantResult.value;

    const step4 = session.getStepData(4) as { storages?: unknown[] } | null;
    const hasCustomStorages = step4?.storages && (step4.storages as unknown[]).length > 0;

    if (!hasCustomStorages) {
      const storageName = defaultStorageName(step3.businessType);
      await this.commandBus.execute<CreateStorageCommand, CreateStorageResult>(
        new CreateStorageCommand(tenantId, StorageType.CUSTOM_ROOM, storageName, undefined, 'General'),
      );
    }

    session.markCompleted();
    await this.sessionContract.save(session);

    return ok({ path: OnboardingPath.CREATE, tenantId, tenantName: name, role: 'OWNER' });
  }

  private async handleJoinPath(
    command: CompleteOnboardingCommand,
    invitationCode: string | null,
  ): Promise<CompleteOnboardingResult> {
    if (!invitationCode) {
      return err(new OnboardingIncompleteError('step 0 (invitation code)'));
    }

    const invitation = await this.invitationContract.findByToken(invitationCode);
    if (!invitation) {
      return err(new InvitationNotFoundError());
    }
    if (invitation.isAlreadyAccepted()) {
      return err(new InvitationAlreadyUsedError());
    }
    if (invitation.isExpired()) {
      return err(new InvitationExpiredError());
    }
    if (!invitation.emailMatches(command.userEmail)) {
      return err(new InvitationEmailMismatchError());
    }

    const userAggregate = await this.mediator.user.findByUUID(command.userUUID);
    if (!userAggregate?.id) {
      return err(new OnboardingNotFoundError());
    }

    const member = TenantMemberModel.create({
      tenantId: invitation.tenantId,
      userId: userAggregate.id,
      userUUID: command.userUUID,
      role: invitation.role,
    });

    await this.memberContract.persist(member);
    await this.invitationContract.markAccepted(invitation.id);

    const session = await this.sessionContract.findByUserUUID(command.userUUID);
    if (session) {
      session.markCompleted();
      await this.sessionContract.save(session);
    }

    return ok({
      path: OnboardingPath.JOIN,
      tenantId: invitation.tenantUUID,
      tenantName: invitation.tenantName,
      role: invitation.role,
    });
  }
}
