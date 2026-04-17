import { CommandBus } from '@nestjs/cqrs';
import { CompleteOnboardingHandler } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.handler';
import { CompleteOnboardingCommand } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { ITenantInvitationContract } from '@onboarding/domain/contracts/tenant-invitation.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingIncompleteError } from '@onboarding/domain/errors/onboarding-incomplete.error';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { InvitationEmailMismatchError } from '@onboarding/domain/errors/invitation-email-mismatch.error';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from 'neverthrow';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestDomainException extends DomainException {
  constructor() {
    super('TEST_ERROR', 'test domain error');
  }
}

function buildCommand(
  overrides: Partial<CompleteOnboardingCommand> = {},
): CompleteOnboardingCommand {
  return {
    userUUID: 'user-uuid-123',
    userEmail: 'test@example.com',
    ...overrides,
  } as CompleteOnboardingCommand;
}

function buildSession(overrides: {
  path?: OnboardingPath | null;
  status?: OnboardingStatus;
  invitationCode?: string | null;
  stepData?: Record<string, unknown>;
}): OnboardingSessionModel {
  return OnboardingSessionModel.reconstitute({
    id: 'session-uuid',
    userUUID: 'user-uuid-123',
    path: overrides.path ?? null,
    currentStep: 1,
    stepData: overrides.stepData ?? {},
    invitationCode: overrides.invitationCode ?? null,
    status: overrides.status ?? OnboardingStatus.IN_PROGRESS,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildInvitation(
  overrides: {
    isAlreadyAccepted?: boolean;
    isExpired?: boolean;
    emailMatches?: boolean;
  } = {},
): TenantInvitationModel {
  return {
    id: 'invitation-uuid',
    tenantId: 1,
    tenantUUID: 'tenant-uuid-456',
    tenantName: 'Test Tenant',
    email: 'test@example.com',
    role: 'VIEWER',
    isAlreadyAccepted: jest.fn().mockReturnValue(overrides.isAlreadyAccepted ?? false),
    isExpired: jest.fn().mockReturnValue(overrides.isExpired ?? false),
    emailMatches: jest.fn().mockReturnValue(overrides.emailMatches ?? true),
  } as unknown as TenantInvitationModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CompleteOnboardingHandler', () => {
  let handler: CompleteOnboardingHandler;
  let sessionContract: jest.Mocked<IOnboardingSessionContract>;
  let invitationContract: jest.Mocked<ITenantInvitationContract>;
  let memberContract: jest.Mocked<ITenantMemberContract>;
  let tenantContract: jest.Mocked<ITenantContract>;
  let commandBus: jest.Mocked<CommandBus>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    sessionContract = {
      findByUserUUID: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IOnboardingSessionContract>;

    invitationContract = {
      findByToken: jest.fn(),
      markAccepted: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITenantInvitationContract>;

    memberContract = {
      persist: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITenantMemberContract>;

    tenantContract = {} as unknown as jest.Mocked<ITenantContract>;

    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    mediator = {
      user: { findByUUID: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    handler = new CompleteOnboardingHandler(
      sessionContract,
      invitationContract,
      memberContract,
      tenantContract,
      commandBus,
      mediator,
    );
  });

  // ── Session not found ──────────────────────────────────────────────────────

  describe('Given no onboarding session exists for the user', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(null);
      });

      it('Then it returns err with OnboardingNotFoundError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingNotFoundError);
      });
    });
  });

  // ── Already completed ──────────────────────────────────────────────────────

  describe('Given the onboarding session is already completed', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ status: OnboardingStatus.COMPLETED }),
        );
      });

      it('Then it returns err with OnboardingAlreadyCompletedError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingAlreadyCompletedError);
      });
    });
  });

  // ── Missing path selection ─────────────────────────────────────────────────

  describe('Given the session has no path selected yet', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(buildSession({ path: null }));
      });

      it('Then it returns err with OnboardingIncompleteError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingIncompleteError);
      });
    });
  });

  // ── CREATE path ────────────────────────────────────────────────────────────

  describe('Given the session is in CREATE path', () => {
    describe('When the businessProfile section is missing', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.CREATE, stepData: {} }),
        );
      });

      it('Then it returns err with OnboardingIncompleteError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingIncompleteError);
      });
    });

    describe('When the tenant creation fails with a non-DomainException error', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute.mockResolvedValue(err(new Error('unexpected infra error')));
      });

      it('Then it rethrows the non-domain error', async () => {
        await expect(handler.execute(buildCommand())).rejects.toThrow('unexpected infra error');
      });
    });

    describe('When the tenant creation fails with a DomainException', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute.mockResolvedValue(err(new TestDomainException()));
      });

      it('Then it returns err with the domain exception', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainException);
      });
    });

    describe('When tenant creation succeeds with no custom storages (food businessType)', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'food',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Test Biz' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it returns ok with CREATE path and tenant info', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.path).toBe(OnboardingPath.CREATE);
        expect(data.tenantName).toBe('Test Biz');
        expect(data.role).toBe('OWNER');
      });
    });

    describe('When tenant creation succeeds with retail businessType', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Retail Store',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Retail Store' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it returns ok and creates default storage named Tienda Principal', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
      });
    });

    describe('When tenant creation succeeds with wholesale businessType', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Wholesale Co',
                businessType: 'wholesale',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Wholesale Co' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it returns ok and creates default storage named Tienda Principal', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
      });
    });

    describe('When tenant creation succeeds with healthcare businessType', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Health Clinic',
                businessType: 'healthcare',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Health Clinic' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it returns ok and creates default storage named Consultorio Principal', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
      });
    });

    describe('When tenant creation succeeds with manufacturing businessType', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Factory Inc',
                businessType: 'manufacturing',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Factory Inc' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it returns ok and creates default storage named Taller Principal', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
      });
    });

    describe('When tenant creation succeeds with an unknown businessType', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Generic Biz',
                businessType: 'other',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Generic Biz' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it returns ok and creates default storage named Espacio Principal', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
      });
    });

    describe('When tenant creation succeeds and the user configured spaces in Step 4', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
              spaces: {
                spaces: [
                  {
                    type: 'WAREHOUSE',
                    name: 'Bodega Central',
                    address: 'Av. Industrial 500',
                  },
                  {
                    type: 'CUSTOM_ROOM',
                    name: 'Showroom',
                    roomType: 'Showroom',
                    icon: 'storefront',
                    color: '#10B981',
                  },
                ],
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Test Biz' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'warehouse-uuid-1' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'custom-room-uuid-1' }));
      });

      it('Then it creates one storage per configured space and skips the default', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        // 1 create-tenant + 2 create-storage (warehouse + custom room)
        expect(commandBus.execute).toHaveBeenCalledTimes(3);

        const createCalls = commandBus.execute.mock.calls
          .slice(1)
          .map((call) => call[0] as Record<string, unknown> & { constructor: { name: string } });
        expect(createCalls[0].constructor.name).toBe('CreateWarehouseCommand');
        expect(createCalls[0].name).toBe('Bodega Central');
        expect(createCalls[0].address).toBe('Av. Industrial 500');
        expect(createCalls[1].constructor.name).toBe('CreateCustomRoomCommand');
        expect(createCalls[1].name).toBe('Showroom');
        expect(createCalls[1].roomType).toBe('Showroom');
        expect(createCalls[1].icon).toBe('storefront');
        expect(createCalls[1].color).toBe('#10B981');
      });
    });

    describe('When tenant creation succeeds and the user configured a minimal CUSTOM_ROOM space (no roomType, icon, color)', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
              spaces: {
                spaces: [
                  {
                    type: 'CUSTOM_ROOM',
                    name: 'Sala Comodín',
                    address: 'Av. 1',
                  },
                ],
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-min', name: 'Test Biz' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'custom-room-min-1' }));
      });

      it('Then the CreateCustomRoomCommand uses the General/box/indigo defaults', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        const createCall = commandBus.execute.mock.calls[1][0] as Record<string, unknown> & {
          constructor: { name: string };
        };
        expect(createCall.constructor.name).toBe('CreateCustomRoomCommand');
        expect(createCall.roomType).toBe('General');
        expect(createCall.icon).toBe('box');
        expect(createCall.color).toBe('#6366F1');
      });
    });

    describe('When tenant creation succeeds and the user configured a STORE_ROOM space', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
              spaces: {
                spaces: [
                  {
                    type: 'STORE_ROOM',
                    name: 'Bodega Sur',
                    address: 'Calle 10',
                  },
                ],
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-789', name: 'Test Biz' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'store-room-uuid-1' }));
      });

      it('Then it dispatches a CreateStoreRoomCommand with the trimmed name and address', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(2);

        const createCall = commandBus.execute.mock.calls[1][0] as Record<string, unknown> & {
          constructor: { name: string };
        };
        expect(createCall.constructor.name).toBe('CreateStoreRoomCommand');
        expect(createCall.name).toBe('Bodega Sur');
        expect(createCall.address).toBe('Calle 10');
      });
    });

    describe('When the spaces section contains malformed entries', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({
            path: OnboardingPath.CREATE,
            stepData: {
              businessProfile: {
                name: 'Test Biz',
                businessType: 'retail',
                country: 'MX',
                timezone: 'America/Mexico_City',
              },
              spaces: {
                spaces: [
                  { type: 'INVALID_TYPE', name: 'Oops' },
                  { type: 'WAREHOUSE' }, // missing name
                  null,
                ],
              },
            },
          }),
        );
        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'tenant-uuid-456', name: 'Test Biz' }))
          .mockResolvedValueOnce(ok(undefined));
      });

      it('Then it falls back to the default storage', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        // 1 create-tenant + 1 default create-custom-room
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
        const fallbackCall = commandBus.execute.mock.calls[1][0] as Record<string, unknown> & {
          constructor: { name: string };
        };
        expect(fallbackCall.constructor.name).toBe('CreateCustomRoomCommand');
        expect(fallbackCall.name).toBe('Tienda Principal');
      });
    });
  });

  // ── JOIN path ──────────────────────────────────────────────────────────────

  describe('Given the session is in JOIN path with no invitation code', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.JOIN, invitationCode: null }),
        );
      });

      it('Then it returns err with OnboardingIncompleteError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingIncompleteError);
      });
    });
  });

  describe('Given the session is in JOIN path with an invitation code', () => {
    describe('When the invitation is not found', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
        );
        invitationContract.findByToken.mockResolvedValue(null);
      });

      it('Then it returns err with InvitationNotFoundError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationNotFoundError);
      });
    });

    describe('When the invitation is already accepted', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
        );
        invitationContract.findByToken.mockResolvedValue(
          buildInvitation({ isAlreadyAccepted: true }),
        );
      });

      it('Then it returns err with InvitationAlreadyUsedError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationAlreadyUsedError);
      });
    });

    describe('When the invitation is expired', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
        );
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ isExpired: true }));
      });

      it('Then it returns err with InvitationExpiredError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationExpiredError);
      });
    });

    describe('When the invitation email does not match the user email', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
        );
        invitationContract.findByToken.mockResolvedValue(buildInvitation({ emailMatches: false }));
      });

      it('Then it returns err with InvitationEmailMismatchError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvitationEmailMismatchError);
      });
    });

    describe('When the user aggregate is not found', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID.mockResolvedValue(
          buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
        );
        invitationContract.findByToken.mockResolvedValue(buildInvitation());
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(null);
      });

      it('Then it returns err with OnboardingNotFoundError', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingNotFoundError);
      });
    });

    describe('When all validation passes and session is found for completion', () => {
      beforeEach(() => {
        sessionContract.findByUserUUID
          .mockResolvedValueOnce(
            buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
          )
          .mockResolvedValueOnce(
            buildSession({ path: OnboardingPath.JOIN, invitationCode: 'inv-token-xyz' }),
          );
        invitationContract.findByToken.mockResolvedValue(buildInvitation());
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue({
          id: 42,
          uuid: 'user-uuid-123',
        });
      });

      it('Then it returns ok with JOIN path and tenant info', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.path).toBe(OnboardingPath.JOIN);
        expect(data.tenantName).toBe('Test Tenant');
        expect(data.role).toBe('VIEWER');
      });
    });
  });
});
