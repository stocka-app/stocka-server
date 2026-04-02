import { CommandBus } from '@nestjs/cqrs';
import { SaveOnboardingStepController } from '@onboarding/infrastructure/http/controllers/save-onboarding-step/save-onboarding-step.controller';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import { ok, err } from 'neverthrow';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { SaveOnboardingStepInDto } from '@onboarding/infrastructure/http/controllers/save-onboarding-step/save-onboarding-step-in.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUser(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    uuid: 'user-uuid-123',
    email: 'test@example.com',
    tenantId: null,
    role: null,
    tierLimits: null,
    ...overrides,
  };
}

function buildDto(): SaveOnboardingStepInDto {
  return {
    section: 'businessProfile',
    data: { name: 'Test Biz' },
    currentStep: 1,
  } as unknown as SaveOnboardingStepInDto;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SaveOnboardingStepController', () => {
  let controller: SaveOnboardingStepController;
  let commandBus: jest.Mocked<CommandBus>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;

    mediator = {
      user: { updateLocale: jest.fn().mockResolvedValue(undefined) },
    } as unknown as jest.Mocked<MediatorService>;

    controller = new SaveOnboardingStepController(commandBus, mediator);
  });

  describe('Given a valid onboarding step save request', () => {
    describe('When the command succeeds', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ status: 'in_progress', currentStep: 1, path: null }),
        );
      });

      it('Then it returns the session status details', async () => {
        const result = await controller.handle(buildDto(), buildUser());

        expect(result).toEqual({ status: 'in_progress', currentStep: 1, path: null });
      });

      it('Then it calls updateLocale with the normalized locale', async () => {
        await controller.handle(buildDto(), buildUser(), 'en-US');

        expect(mediator.user.updateLocale).toHaveBeenCalledWith('user-uuid-123', 'en');
      });
    });

    describe('When the accept-language header is absent', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ status: 'in_progress', currentStep: 1, path: null }),
        );
      });

      it('Then it defaults to es locale', async () => {
        await controller.handle(buildDto(), buildUser(), undefined);

        expect(mediator.user.updateLocale).toHaveBeenCalledWith('user-uuid-123', 'es');
      });
    });

    describe('When the accept-language header is a non-en language', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ status: 'in_progress', currentStep: 1, path: null }),
        );
      });

      it('Then it defaults to es locale for unsupported languages', async () => {
        await controller.handle(buildDto(), buildUser(), 'fr-FR');

        expect(mediator.user.updateLocale).toHaveBeenCalledWith('user-uuid-123', 'es');
      });
    });

    describe('When updateLocale rejects', () => {
      beforeEach(() => {
        commandBus.execute.mockResolvedValue(
          ok({ status: 'in_progress', currentStep: 1, path: null }),
        );
        (mediator.user.updateLocale as jest.Mock).mockRejectedValue(new Error('locale update failed'));
      });

      it('Then it propagates the error', async () => {
        await expect(controller.handle(buildDto(), buildUser(), 'en-US')).rejects.toThrow('locale update failed');
      });
    });

    describe('When the command fails with a DomainException', () => {
      class TestDomainException extends DomainException {
        constructor() {
          super('TEST_ERROR', 'test domain error');
        }
      }

      beforeEach(() => {
        commandBus.execute.mockResolvedValue(err(new TestDomainException()));
      });

      it('Then it throws the domain exception', async () => {
        await expect(controller.handle(buildDto(), buildUser())).rejects.toBeInstanceOf(
          TestDomainException,
        );
      });
    });
  });
});
