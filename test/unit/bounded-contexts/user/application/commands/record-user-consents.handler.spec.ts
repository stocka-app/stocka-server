import { Repository } from 'typeorm';
import { RecordUserConsentsHandler } from '@user/application/commands/record-user-consents/record-user-consents.handler';
import {
  RecordUserConsentsCommand,
} from '@user/application/commands/record-user-consents/record-user-consents.command';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(overrides: Partial<RecordUserConsentsCommand> = {}): RecordUserConsentsCommand {
  return {
    userUUID: 'user-uuid-123',
    consents: {
      terms: true,
      marketing: false,
      analytics: true,
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Jest/test',
    ...overrides,
  } as RecordUserConsentsCommand;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RecordUserConsentsHandler', () => {
  let handler: RecordUserConsentsHandler;
  let consentRepository: jest.Mocked<Repository<UserConsentEntity>>;

  beforeEach(() => {
    consentRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserConsentEntity>>;

    handler = new RecordUserConsentsHandler(consentRepository);
  });

  describe('Given a valid consent payload', () => {
    describe('When execute is called successfully', () => {
      beforeEach(() => {
        consentRepository.save.mockResolvedValue([] as unknown as UserConsentEntity);
      });

      it('Then it returns ok with undefined', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBeUndefined();
      });

      it('Then it saves 4 consent rows (terms, privacy, marketing, analytics)', async () => {
        await handler.execute(buildCommand());

        const saved = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        expect(saved).toHaveLength(4);
      });

      it('Then it associates consent rows with the correct user UUID', async () => {
        await handler.execute(buildCommand());

        const saved = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        for (const row of saved) {
          expect(row.userUUID).toBe('user-uuid-123');
        }
      });
    });
  });

});
