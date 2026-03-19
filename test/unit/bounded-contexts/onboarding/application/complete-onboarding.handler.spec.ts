import { NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CompleteOnboardingHandler } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.handler';
import { CompleteOnboardingCommand } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { ITenantInvitationContract } from '@onboarding/domain/contracts/tenant-invitation.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { TenantInvitationModel } from '@onboarding/domain/models/tenant-invitation.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';
import { OnboardingIncompleteError } from '@onboarding/domain/errors/onboarding-incomplete.error';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { InvitationEmailMismatchError } from '@onboarding/domain/errors/invitation-email-mismatch.error';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ok, err } from '@shared/domain/result';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

describe('CompleteOnboardingHandler', () => {
  let handler: CompleteOnboardingHandler;
  let sessionContract: jest.Mocked<IOnboardingSessionContract>;
  let invitationContract: jest.Mocked<ITenantInvitationContract>;
  let memberContract: jest.Mocked<ITenantMemberContract>;
  let tenantContract: jest.Mocked<ITenantContract>;
  let commandBus: jest.Mocked<CommandBus>;
  let mediator: { user: { findByUUID: jest.Mock } };

  const USER_UUID = '019538a0-0000-7000-8000-000000000001';
  const USER_EMAIL = 'owner@empresa.mx';

  const makeSession = (path: 'CREATE' | 'JOIN' | null = null, invitationCode?: string): OnboardingSessionModel => {
    const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
    if (path) {
      session.saveStep(0, { path, ...(invitationCode ? { invitationCode } : {}) });
    }
    return session;
  };

  const makeInvitation = (overrides: Partial<{
    acceptedAt: Date | null;
    expiresAt: Date;
    email: string;
  }> = {}): TenantInvitationModel =>
    TenantInvitationModel.reconstitute({
      id: 'inv-uuid-1',
      tenantId: 42,
      tenantUUID: 'tenant-uuid-42',
      tenantName: 'Ferretería El Clavo',
      invitedBy: 1,
      email: overrides.email ?? USER_EMAIL,
      role: 'MANAGER',
      token: 'validtoken',
      acceptedAt: overrides.acceptedAt ?? null,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

  beforeEach(() => {
    sessionContract = { findByUserUUID: jest.fn(), save: jest.fn() };
    invitationContract = { findByToken: jest.fn(), markAccepted: jest.fn() };
    memberContract = {
      findByTenantAndUserId: jest.fn(),
      findActiveByUserUUID: jest.fn(),
      findAllByTenantId: jest.fn(),
      persist: jest.fn(),
    };
    tenantContract = {
      findById: jest.fn(),
      findByUUID: jest.fn(),
      findBySlug: jest.fn(),
      persist: jest.fn(),
    };
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    mediator = { user: { findByUUID: jest.fn() } };

    handler = new CompleteOnboardingHandler(
      sessionContract,
      invitationContract,
      memberContract,
      tenantContract,
      commandBus,
      mediator as unknown as MediatorService,
    );
  });

  describe('Given a user with no onboarding session', () => {
    describe('When complete is called', () => {
      it('Then it returns an OnboardingNotFoundError', async () => {
        sessionContract.findByUserUUID.mockResolvedValue(null);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingNotFoundError));
      });
    });
  });

  describe('Given a user whose onboarding is already COMPLETED', () => {
    describe('When complete is called again', () => {
      it('Then it returns an OnboardingAlreadyCompletedError', async () => {
        const session = makeSession('CREATE');
        session.markCompleted();
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingAlreadyCompletedError));
      });
    });
  });

  describe('Given a user who has not selected a path yet', () => {
    describe('When complete is called', () => {
      it('Then it returns an OnboardingIncompleteError', async () => {
        const session = makeSession(null);
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingIncompleteError));
      });
    });
  });

  describe('Given a user on the CREATE path who is missing step 3 data', () => {
    describe('When complete is called', () => {
      it('Then it returns an OnboardingIncompleteError', async () => {
        const session = makeSession('CREATE');
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingIncompleteError));
      });
    });
  });

  describe('Given a fully configured CREATE path session', () => {
    describe('When complete is called without step 4 data (skipped)', () => {
      it('Then it creates the tenant and a default storage space', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Mi Tienda',
          businessType: 'retail',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'new-tenant-uuid', name: 'Mi Tienda' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'new-storage-uuid' }));

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isOk()).toBe(true);
        result.map((data) => {
          expect(data.path).toBe(OnboardingPath.CREATE);
          expect(data.tenantId).toBe('new-tenant-uuid');
          expect(data.tenantName).toBe('Mi Tienda');
          expect(data.role).toBe('OWNER');
        });
        expect(commandBus.execute).toHaveBeenCalledTimes(2);
        const [, storageCall] = commandBus.execute.mock.calls;
        const storageCmd = storageCall[0] as { type: StorageType; name: string };
        expect(storageCmd.type).toBe(StorageType.CUSTOM_ROOM);
        expect(storageCmd.name).toBe('Tienda Principal');
      });
    });

    describe('When complete is called with step 4 data (custom storage defined)', () => {
      it('Then it creates the tenant but skips the default storage creation', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Mi Tienda',
          businessType: 'food',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        session.saveStep(4, { storages: [{ name: 'Cocina', type: 'CUSTOM_ROOM' }] });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        commandBus.execute.mockResolvedValueOnce(ok({ tenantId: 'new-tenant-uuid', name: 'Mi Tienda' }));

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(commandBus.execute).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a JOIN path session with no invitation code', () => {
    describe('When complete is called', () => {
      it('Then it returns an OnboardingIncompleteError', async () => {
        const session = makeSession('JOIN');
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingIncompleteError));
      });
    });
  });

  describe('Given a JOIN path session with an invalid invitation token', () => {
    describe('When complete is called', () => {
      it('Then it returns an InvitationNotFoundError', async () => {
        const session = makeSession('JOIN', 'invalidtoken');
        sessionContract.findByUserUUID.mockResolvedValue(session);
        invitationContract.findByToken.mockResolvedValue(null);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(InvitationNotFoundError));
      });
    });
  });

  describe('Given a JOIN path session with an already-used invitation', () => {
    describe('When complete is called', () => {
      it('Then it returns an InvitationAlreadyUsedError', async () => {
        const session = makeSession('JOIN', 'validtoken');
        sessionContract.findByUserUUID.mockResolvedValue(session);
        invitationContract.findByToken.mockResolvedValue(
          makeInvitation({ acceptedAt: new Date() }),
        );

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(InvitationAlreadyUsedError));
      });
    });
  });

  describe('Given a JOIN path session with an expired invitation', () => {
    describe('When complete is called', () => {
      it('Then it returns an InvitationExpiredError', async () => {
        const session = makeSession('JOIN', 'validtoken');
        sessionContract.findByUserUUID.mockResolvedValue(session);
        invitationContract.findByToken.mockResolvedValue(
          makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
        );

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(InvitationExpiredError));
      });
    });
  });

  describe('Given a JOIN path session with an invitation for a different email', () => {
    describe('When complete is called', () => {
      it('Then it returns an InvitationEmailMismatchError', async () => {
        const session = makeSession('JOIN', 'validtoken');
        sessionContract.findByUserUUID.mockResolvedValue(session);
        invitationContract.findByToken.mockResolvedValue(
          makeInvitation({ email: 'otheruser@empresa.mx' }),
        );

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(InvitationEmailMismatchError));
      });
    });
  });

  describe('Given a valid JOIN path session with a matching invitation', () => {
    describe('When complete is called', () => {
      it('Then it adds the user as a member and marks the invitation as accepted', async () => {
        const session = makeSession('JOIN', 'validtoken');
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));
        invitationContract.findByToken.mockResolvedValue(makeInvitation());
        invitationContract.markAccepted.mockResolvedValue();
        mediator.user.findByUUID.mockResolvedValue({ id: 99 });
        memberContract.persist.mockResolvedValue({} as any);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isOk()).toBe(true);
        result.map((data) => {
          expect(data.path).toBe(OnboardingPath.JOIN);
          expect(data.tenantId).toBe('tenant-uuid-42');
          expect(data.tenantName).toBe('Ferretería El Clavo');
          expect(data.role).toBe('MANAGER');
        });
        expect(memberContract.persist).toHaveBeenCalledTimes(1);
        expect(invitationContract.markAccepted).toHaveBeenCalledWith('inv-uuid-1');
      });
    });
  });

  describe('Given a CREATE path session with food businessType and no step 4 data', () => {
    describe('When complete is called', () => {
      it('Then it creates the default storage named "Cocina / Preparación"', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Taquería El Sabor',
          businessType: 'food',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'food-tenant-uuid', name: 'Taquería El Sabor' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'storage-uuid' }));

        await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        const [, storageCall] = commandBus.execute.mock.calls;
        const storageCmd = storageCall[0] as { name: string };
        expect(storageCmd.name).toBe('Cocina / Preparación');
      });
    });
  });

  describe('Given a CREATE path session with healthcare businessType and no step 4 data', () => {
    describe('When complete is called', () => {
      it('Then it creates the default storage named "Consultorio Principal"', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Clínica Salud',
          businessType: 'healthcare',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'health-tenant-uuid', name: 'Clínica Salud' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'storage-uuid' }));

        await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        const [, storageCall] = commandBus.execute.mock.calls;
        const storageCmd = storageCall[0] as { name: string };
        expect(storageCmd.name).toBe('Consultorio Principal');
      });
    });
  });

  describe('Given a CREATE path session with manufacturing businessType and no step 4 data', () => {
    describe('When complete is called', () => {
      it('Then it creates the default storage named "Taller Principal"', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Taller Mecánico',
          businessType: 'manufacturing',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'mfg-tenant-uuid', name: 'Taller Mecánico' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'storage-uuid' }));

        await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        const [, storageCall] = commandBus.execute.mock.calls;
        const storageCmd = storageCall[0] as { name: string };
        expect(storageCmd.name).toBe('Taller Principal');
      });
    });
  });

  describe('Given a CREATE path session with an unrecognised businessType and no step 4 data', () => {
    describe('When complete is called', () => {
      it('Then it creates the default storage named "Espacio Principal"', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Mi Negocio',
          businessType: 'other',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        commandBus.execute
          .mockResolvedValueOnce(ok({ tenantId: 'generic-tenant-uuid', name: 'Mi Negocio' }))
          .mockResolvedValueOnce(ok({ storageUUID: 'storage-uuid' }));

        await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        const [, storageCall] = commandBus.execute.mock.calls;
        const storageCmd = storageCall[0] as { name: string };
        expect(storageCmd.name).toBe('Espacio Principal');
      });
    });
  });

  describe('Given a CREATE path session where tenant creation fails with a DomainException', () => {
    describe('When complete is called', () => {
      it('Then it returns err with the domain error', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Mi Tienda',
          businessType: 'retail',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const { BusinessLogicException } = await import('@shared/domain/exceptions/business-logic.exception');
        class StubTenantError extends BusinessLogicException {
          constructor() { super('some domain error', 'TENANT_ERROR'); }
        }
        commandBus.execute.mockResolvedValueOnce(err(new StubTenantError()));

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
      });
    });
  });

  describe('Given a CREATE path session where tenant creation fails with a NotFoundException', () => {
    describe('When complete is called', () => {
      it('Then it re-throws the NotFoundException instead of returning err', async () => {
        const session = makeSession('CREATE');
        session.saveStep(3, {
          name: 'Mi Tienda',
          businessType: 'retail',
          country: 'MX',
          timezone: 'America/Mexico_City',
        });
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const notFound = new NotFoundException('user not found');
        commandBus.execute.mockResolvedValueOnce(err(notFound));

        await expect(
          handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL)),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Given a valid JOIN path session where the user aggregate cannot be resolved', () => {
    describe('When complete is called', () => {
      it('Then it returns an OnboardingNotFoundError', async () => {
        const session = makeSession('JOIN', 'validtoken');
        sessionContract.findByUserUUID.mockResolvedValue(session);
        invitationContract.findByToken.mockResolvedValue(makeInvitation());
        mediator.user.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingNotFoundError));
      });
    });
  });

  describe('Given a valid JOIN path session where no session exists when marking completed', () => {
    describe('When complete is called', () => {
      it('Then it still succeeds without marking any session as completed', async () => {
        const session = makeSession('JOIN', 'validtoken');
        // First call returns the session (for the JOIN path entry guard)
        sessionContract.findByUserUUID
          .mockResolvedValueOnce(session)
          // Second call (end of handleJoinPath) returns null — session already gone
          .mockResolvedValueOnce(null);
        invitationContract.findByToken.mockResolvedValue(makeInvitation());
        invitationContract.markAccepted.mockResolvedValue();
        mediator.user.findByUUID.mockResolvedValue({ id: 99 });
        memberContract.persist.mockResolvedValue({} as any);

        const result = await handler.execute(new CompleteOnboardingCommand(USER_UUID, USER_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(sessionContract.save).not.toHaveBeenCalled();
      });
    });
  });
});
