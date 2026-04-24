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
import { CreateCustomRoomCommand } from '@storage/application/commands/create-custom-room/create-custom-room.command';
import { CreateWarehouseCommand } from '@storage/application/commands/create-warehouse/create-warehouse.command';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { CreateTenantResult } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding-out.dto';
import { CreateCustomRoomResult } from '@storage/application/commands/create-custom-room/create-custom-room.handler';
import { CreateWarehouseResult } from '@storage/application/commands/create-warehouse/create-warehouse.handler';
import { CreateStoreRoomResult } from '@storage/application/commands/create-store-room/create-store-room.handler';

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

interface OnboardingSpaceConfig {
  type: 'CUSTOM_ROOM' | 'STORE_ROOM' | 'WAREHOUSE';
  name: string;
  roomType?: string;
  address?: string;
  icon?: string;
  color?: string;
}

function isValidSpaceConfig(value: unknown): value is OnboardingSpaceConfig {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const type = record.type;
  const name = record.name;
  if (type !== 'CUSTOM_ROOM' && type !== 'STORE_ROOM' && type !== 'WAREHOUSE') return false;
  if (typeof name !== 'string' || name.trim().length === 0) return false;
  return true;
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
      return this.handleJoinPath(command, session.invitationCode?.getValue() ?? null);
    }

    return this.handleCreatePath(command, session);
  }

  private async handleCreatePath(
    command: CompleteOnboardingCommand,
    session: import('@onboarding/domain/models/onboarding-session.model').OnboardingSessionModel,
  ): Promise<CompleteOnboardingResult> {
    const businessProfile = session.getSectionData('businessProfile') as {
      name?: string;
      businessType?: string;
      country?: string;
      timezone?: string;
    } | null;

    if (
      !businessProfile?.name ||
      !businessProfile.businessType ||
      !businessProfile.country ||
      !businessProfile.timezone
    ) {
      return err(new OnboardingIncompleteError('businessProfile section'));
    }

    const { name: profileName, businessType, country, timezone } = businessProfile;

    const createTenantResult = await this.commandBus.execute<
      CreateTenantCommand,
      CreateTenantResult
    >(new CreateTenantCommand(command.userUUID, profileName, businessType, country, timezone));

    return createTenantResult.match(
      async ({ tenantId, name }) => {
        // Step 4 "Spaces" persists the user's configured storages under the
        // `spaces` section as { spaces: SpaceConfig[] }. If present, create
        // one storage per entry using the per-type command that matches it.
        // If absent, fall back to a single default custom room for the
        // business type — preserving the legacy behaviour for users who skip
        // the step.
        const spacesSection = session.getSectionData('spaces') as {
          spaces?: unknown[];
        } | null;
        const rawSpaces = Array.isArray(spacesSection?.spaces) ? spacesSection.spaces : [];
        const configuredSpaces = rawSpaces.filter(isValidSpaceConfig);

        if (configuredSpaces.length > 0) {
          for (const space of configuredSpaces) {
            await this.createSpaceFor(tenantId, command.userUUID, space);
          }
        } else {
          const storageName = defaultStorageName(businessType);
          await this.commandBus.execute<CreateCustomRoomCommand, CreateCustomRoomResult>(
            new CreateCustomRoomCommand(
              tenantId,
              storageName,
              'General',
              'Pendiente',
              command.userUUID,
              'Pendiente',
              'box',
              '#6366F1',
            ),
          );
        }

        session.markCompleted();
        await this.sessionContract.save(session);

        return ok({ path: OnboardingPath.CREATE, tenantId, tenantName: name, role: 'OWNER' });
      },
      /* istanbul ignore next */
      (tenantError) => {
        if (tenantError instanceof DomainException) {
          return err(tenantError);
        }
        throw tenantError;
      },
    );
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
    /* istanbul ignore next */
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

    // session always exists at this point (execute() verified it before delegating here)
    const session = await this.sessionContract.findByUserUUID(command.userUUID);
    session!.markCompleted();
    await this.sessionContract.save(session!);

    return ok({
      path: OnboardingPath.JOIN,
      tenantId: invitation.tenantUUID,
      tenantName: invitation.tenantName.getValue(),
      role: invitation.role,
    });
  }

  private async createSpaceFor(
    tenantId: string,
    actorUUID: string,
    space: OnboardingSpaceConfig,
  ): Promise<void> {
    const address = space.address?.trim().length ? space.address.trim() : 'Pendiente';

    switch (space.type) {
      case 'WAREHOUSE':
        await this.commandBus.execute<CreateWarehouseCommand, CreateWarehouseResult>(
          new CreateWarehouseCommand(tenantId, space.name.trim(), address, actorUUID),
        );
        return;
      case 'STORE_ROOM':
        await this.commandBus.execute<CreateStoreRoomCommand, CreateStoreRoomResult>(
          new CreateStoreRoomCommand(tenantId, space.name.trim(), address, actorUUID),
        );
        return;
      case 'CUSTOM_ROOM':
        await this.commandBus.execute<CreateCustomRoomCommand, CreateCustomRoomResult>(
          new CreateCustomRoomCommand(
            tenantId,
            space.name.trim(),
            space.roomType?.trim().length ? space.roomType.trim() : 'General',
            address,
            actorUUID,
            undefined,
            space.icon?.trim().length ? space.icon.trim() : 'box',
            space.color?.trim().length ? space.color.trim() : '#6366F1',
          ),
        );
        return;
    }
  }
}
