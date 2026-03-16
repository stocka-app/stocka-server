import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { SignOutHandler } from '@authentication/application/commands/sign-out/sign-out.handler';
import { SignOutCommand } from '@authentication/application/commands/sign-out/sign-out.command';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { SessionModel } from '@authentication/domain/models/session.model';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { SessionArchivedEvent } from '@authentication/domain/events/session-archived.event';
import { UserSignedOutEvent } from '@authentication/domain/events/user-signed-out.event';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

function buildSession(uuid: string, accountId: number): SessionModel {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return SessionModel.reconstitute({ id: 1, uuid, accountId, tokenHash: 'hash', expiresAt });
}

describe('SignOutHandler', () => {
  let handler: SignOutHandler;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'findByTokenHash' | 'archiveAllByAccountId'>>;
  let mediator: { user: { findByAccountId: jest.Mock } };
  let eventBus: { publish: jest.Mock };

  const SESSION_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const USER_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  const FAKE_REFRESH_TOKEN = 'some.jwt.refresh.token';

  beforeEach(async () => {
    sessionContract = {
      findByTokenHash: jest.fn(),
      archiveAllByAccountId: jest.fn().mockResolvedValue(undefined),
    };

    mediator = {
      user: {
        findByAccountId: jest.fn(),
      },
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignOutHandler,
        { provide: MediatorService, useValue: mediator },
        { provide: EventBus, useValue: eventBus },
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    handler = module.get<SignOutHandler>(SignOutHandler);
  });

  describe('Given a valid refresh token linked to an active session', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildSession(SESSION_UUID, 1));
      mediator.user.findByAccountId.mockResolvedValue(
        UserMother.create({ id: 1, uuid: USER_UUID }),
      );
    });

    describe('When the handler executes', () => {
      it('Then it archives all sessions for the user', async () => {
        await handler.execute(new SignOutCommand(FAKE_REFRESH_TOKEN));
        expect(sessionContract.archiveAllByAccountId).toHaveBeenCalledWith(1);
      });

      it('Then it publishes SessionArchivedEvent and UserSignedOutEvent', async () => {
        await handler.execute(new SignOutCommand(FAKE_REFRESH_TOKEN));
        expect(eventBus.publish).toHaveBeenCalledTimes(2);
        const publishedTypes = (eventBus.publish as jest.Mock).mock.calls.map(
          (args: unknown[]) => (args[0] as object).constructor,
        );
        expect(publishedTypes).toContain(SessionArchivedEvent);
        expect(publishedTypes).toContain(UserSignedOutEvent);
      });
    });
  });

  describe('Given a refresh token that does not match any session', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it does not archive any sessions', async () => {
        await handler.execute(new SignOutCommand(FAKE_REFRESH_TOKEN));
        expect(sessionContract.archiveAllByAccountId).not.toHaveBeenCalled();
      });

      it('Then it does not publish any events', async () => {
        await handler.execute(new SignOutCommand(FAKE_REFRESH_TOKEN));
        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a valid session but user not found', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildSession(SESSION_UUID, 99));
      mediator.user.findByAccountId.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it still archives sessions but does not publish events', async () => {
        await handler.execute(new SignOutCommand(FAKE_REFRESH_TOKEN));
        expect(sessionContract.archiveAllByAccountId).toHaveBeenCalledWith(99);
        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });
});
