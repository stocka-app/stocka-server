import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetUserConsentsHandler } from '@user/application/queries/get-user-consents/get-user-consents.handler';
import { GetUserConsentsQuery } from '@user/application/queries/get-user-consents/get-user-consents.query';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';

describe('GetUserConsentsHandler', () => {
  let handler: GetUserConsentsHandler;
  let consentRepository: jest.Mocked<Pick<Repository<UserConsentEntity>, 'query'>>;

  const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    consentRepository = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserConsentsHandler,
        {
          provide: getRepositoryToken(UserConsentEntity),
          useValue: consentRepository,
        },
      ],
    }).compile();

    handler = module.get<GetUserConsentsHandler>(GetUserConsentsHandler);
  });

  describe('Given the user has recorded consents', () => {
    const GRANTED_AT = new Date('2026-03-21T10:00:00.000Z');

    beforeEach(() => {
      consentRepository.query.mockResolvedValue([
        {
          consentType: 'terms_of_service',
          granted: true,
          documentVersion: 'v1.0',
          grantedAt: GRANTED_AT,
        },
        {
          consentType: 'privacy_policy',
          granted: true,
          documentVersion: 'v1.0',
          grantedAt: GRANTED_AT,
        },
      ]);
    });

    describe('When querying user consents', () => {
      it('Then it returns mapped DTOs with ISO date strings', async () => {
        const result = await handler.execute(new GetUserConsentsQuery(USER_UUID));

        expect(result).toEqual([
          {
            consentType: 'terms_of_service',
            granted: true,
            documentVersion: 'v1.0',
            grantedAt: '2026-03-21T10:00:00.000Z',
          },
          {
            consentType: 'privacy_policy',
            granted: true,
            documentVersion: 'v1.0',
            grantedAt: '2026-03-21T10:00:00.000Z',
          },
        ]);
      });

      it('Then the raw query is called with the user UUID', async () => {
        await handler.execute(new GetUserConsentsQuery(USER_UUID));

        expect(consentRepository.query).toHaveBeenCalledTimes(1);
        expect(consentRepository.query).toHaveBeenCalledWith(
          expect.stringContaining('DISTINCT ON (consent_type)'),
          [USER_UUID],
        );
      });
    });
  });

  describe('Given the user has no consents', () => {
    beforeEach(() => {
      consentRepository.query.mockResolvedValue([]);
    });

    describe('When querying user consents', () => {
      it('Then it returns an empty array', async () => {
        const result = await handler.execute(new GetUserConsentsQuery(USER_UUID));

        expect(result).toEqual([]);
      });
    });
  });
});
