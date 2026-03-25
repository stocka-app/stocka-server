import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordUserConsentsHandler } from '@user/application/commands/record-user-consents/record-user-consents.handler';
import {
  RecordUserConsentsCommand,
  RecordUserConsentsPayload,
} from '@user/application/commands/record-user-consents/record-user-consents.command';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';
import { ConsentType } from '@user/domain/enums/consent-type.enum';

describe('RecordUserConsentsHandler', () => {
  let handler: RecordUserConsentsHandler;
  let consentRepository: jest.Mocked<Pick<Repository<UserConsentEntity>, 'save'>>;

  const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const IP_ADDRESS = '192.168.1.1';
  const USER_AGENT = 'Mozilla/5.0';

  const CONSENTS: RecordUserConsentsPayload = {
    terms: true,
    marketing: false,
    analytics: true,
  };

  beforeEach(async () => {
    consentRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordUserConsentsHandler,
        {
          provide: getRepositoryToken(UserConsentEntity),
          useValue: consentRepository,
        },
      ],
    }).compile();

    handler = module.get<RecordUserConsentsHandler>(RecordUserConsentsHandler);
  });

  describe('Given valid consent data', () => {
    describe('When recording user consents', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the repository save is called with 4 consent rows', async () => {
        await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        expect(consentRepository.save).toHaveBeenCalledTimes(1);
        const savedRows = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        expect(savedRows).toHaveLength(4);
      });

      it('Then all 4 consent types are represented', async () => {
        await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        const savedRows = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        const types = savedRows.map((r) => r.consentType);

        expect(types).toContain(ConsentType.TERMS_OF_SERVICE);
        expect(types).toContain(ConsentType.PRIVACY_POLICY);
        expect(types).toContain(ConsentType.MARKETING_COMMUNICATIONS);
        expect(types).toContain(ConsentType.ANONYMOUS_ANALYTICS);
      });

      it('Then each row has the correct userUuid, ipAddress, and userAgent', async () => {
        await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        const savedRows = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        for (const row of savedRows) {
          expect(row.userUuid).toBe(USER_UUID);
          expect(row.ipAddress).toBe(IP_ADDRESS);
          expect(row.userAgent).toBe(USER_AGENT);
        }
      });

      it('Then terms row is granted true and marketing row is granted false', async () => {
        await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        const savedRows = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        const termsRow = savedRows.find((r) => r.consentType === ConsentType.TERMS_OF_SERVICE);
        const marketingRow = savedRows.find(
          (r) => r.consentType === ConsentType.MARKETING_COMMUNICATIONS,
        );
        const analyticsRow = savedRows.find(
          (r) => r.consentType === ConsentType.ANONYMOUS_ANALYTICS,
        );

        expect(termsRow!.granted).toBe(true);
        expect(marketingRow!.granted).toBe(false);
        expect(analyticsRow!.granted).toBe(true);
      });
    });

    describe('When ipAddress and userAgent are null', () => {
      it('Then rows have null ipAddress and userAgent', async () => {
        await handler.execute(new RecordUserConsentsCommand(USER_UUID, CONSENTS, null, null));

        const savedRows = consentRepository.save.mock.calls[0][0] as UserConsentEntity[];
        for (const row of savedRows) {
          expect(row.ipAddress).toBeNull();
          expect(row.userAgent).toBeNull();
        }
      });
    });
  });

  describe('Given the repository throws an Error', () => {
    describe('When recording user consents', () => {
      it('Then the result is err with ConsentPersistenceError wrapping the message', async () => {
        consentRepository.save.mockRejectedValue(new Error('connection refused'));

        const result = await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        expect(result.isErr()).toBe(true);
        const error = result._unsafeUnwrapErr();
        expect(error.errorCode).toBe('CONSENT_PERSISTENCE_ERROR');
        expect(error.message).toBe('Failed to persist user consents');
        expect(error.details).toEqual([{ field: 'consents', message: 'connection refused' }]);
      });
    });
  });

  describe('Given the repository throws a non-Error value', () => {
    describe('When recording user consents', () => {
      it('Then the result is err with the default fallback message', async () => {
        consentRepository.save.mockRejectedValue('some string error');

        const result = await handler.execute(
          new RecordUserConsentsCommand(USER_UUID, CONSENTS, IP_ADDRESS, USER_AGENT),
        );

        expect(result.isErr()).toBe(true);
        const error = result._unsafeUnwrapErr();
        expect(error.details).toEqual([
          { field: 'consents', message: 'Failed to record user consents' },
        ]);
      });
    });
  });
});
