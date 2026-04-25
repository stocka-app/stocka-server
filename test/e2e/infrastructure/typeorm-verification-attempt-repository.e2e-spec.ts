import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { VerificationAttemptAggregate } from '@authentication/domain/aggregates/verification-attempt.aggregate';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function futureDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

function pastDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() - offsetMs);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmVerificationAttemptRepository (e2e)', () => {
  let dataSource: DataSource;
  let attemptRepo: IVerificationAttemptContract;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    attemptRepo = app.get<IVerificationAttemptContract>(
      INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT,
    );
    uow = app.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  afterEach(async () => {
    await truncateWorkerTables(dataSource);
  });

  describe('TypeOrmVerificationAttemptRepository', () => {
    const testUUID = uuidv4();
    const testIP = '192.168.0.1';
    const testEmail = `attempt-${uuidv4()}@example.com`;

    async function createAttempt(
      overrides: {
        userUUID?: string;
        success?: boolean;
        email?: string;
        ipAddress?: string;
        type?: string;
      } = {},
    ): Promise<VerificationAttemptAggregate> {
      const attempt = VerificationAttemptAggregate.create({
        userUUID: overrides.userUUID ?? testUUID,
        email: overrides.email ?? testEmail,
        ipAddress: overrides.ipAddress ?? testIP,
        userAgent: null,
        codeEntered: null,
        success: overrides.success ?? false,
        verificationType: overrides.type ?? 'sign_in',
      });
      return attemptRepo.persist(attempt);
    }

    describe('Given verification attempts exist in the database', () => {
      let savedAttempt: VerificationAttemptAggregate;

      beforeEach(async () => {
        savedAttempt = await createAttempt();
      });

      describe('When findById is called with the attempt internal id', () => {
        it('Then it returns the matching attempt', async () => {
          const found = await attemptRepo.findById(savedAttempt.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedAttempt.uuid);
        });
      });

      describe('When findByUUID is called with the attempt UUID', () => {
        it('Then it returns the matching attempt', async () => {
          const found = await attemptRepo.findByUUID(savedAttempt.uuid);
          expect(found).not.toBeNull();
        });
      });

      describe('When countFailedByUserUUIDInLastHour is called', () => {
        it('Then it returns the count of failed attempts in the last hour', async () => {
          const count = await attemptRepo.countFailedByUserUUIDInLastHour(testUUID);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When countFailedByUserUUIDInLast24Hours is called', () => {
        it('Then it returns the count of recent failed attempts', async () => {
          const count = await attemptRepo.countFailedByUserUUIDInLast24Hours(testUUID);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When findById is called with a non-existent attempt id', () => {
        it('Then it returns null', async () => {
          const found = await attemptRepo.findById(999999);
          expect(found).toBeNull();
        });
      });

      describe('When findByUUID is called with a non-existent attempt UUID', () => {
        it('Then it returns null', async () => {
          const found = await attemptRepo.findByUUID(uuidv4());
          expect(found).toBeNull();
        });
      });

      describe('When archiveOlderThan is called with a past date', () => {
        it('Then it returns zero when no attempts match the date condition', async () => {
          const affected = await attemptRepo.archiveOlderThan(pastDate(2 * 60 * 60 * 1000));
          expect(affected).toBe(0);
        });
      });

      describe('When countFailedByIpAddressInLastHour is called', () => {
        it('Then it returns the count of recent failed attempts by IP', async () => {
          const count = await attemptRepo.countFailedByIpAddressInLastHour(testIP);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When countFailedByEmailInLastHour is called', () => {
        it('Then it returns the count of recent failed attempts by email', async () => {
          const count = await attemptRepo.countFailedByEmailInLastHour(testEmail);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When findRecentByUserUUID is called with a limit', () => {
        it('Then it returns at most the requested number of attempts', async () => {
          const attempts = await attemptRepo.findRecentByUserUUID(testUUID, 5);
          expect(attempts.length).toBeGreaterThanOrEqual(1);
          expect(attempts.length).toBeLessThanOrEqual(5);
        });
      });

      describe('When countFailedByUserUUIDInLastHourByType is called', () => {
        it('Then it returns the count of attempts filtered by type', async () => {
          const count = await attemptRepo.countFailedByUserUUIDInLastHourByType(
            testUUID,
            'sign_in',
          );
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When archiveOlderThan is called with a future date', () => {
        it('Then it archives matching attempts and returns the affected count', async () => {
          const affected = await attemptRepo.archiveOlderThan(futureDate());
          expect(affected).toBeGreaterThanOrEqual(1);
        });
      });
    });

    describe('Given persist is called within an active UoW transaction', () => {
      it('Then it uses the transaction EntityManager and the attempt is saved', async () => {
        const attempt = VerificationAttemptAggregate.create({
          userUUID: testUUID,
          email: testEmail,
          ipAddress: testIP,
          userAgent: null,
          codeEntered: null,
          success: false,
          verificationType: 'sign_in',
        });

        await uow.begin();
        try {
          const saved = await attemptRepo.persist(attempt);
          expect(saved.uuid).toBeDefined();
          await uow.rollback();
        } catch (error) {
          await uow.rollback();
          throw error;
        }
      });
    });
  });
});
