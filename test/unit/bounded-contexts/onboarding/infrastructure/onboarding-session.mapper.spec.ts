import { OnboardingSessionMapper } from '@onboarding/infrastructure/mappers/onboarding-session.mapper';
import { OnboardingSessionEntity } from '@onboarding/infrastructure/entities/onboarding-session.entity';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

const USER_UUID = '019538a0-0000-7000-8000-000000000001';

function makeEntity(overrides: Partial<OnboardingSessionEntity> = {}): OnboardingSessionEntity {
  return {
    id: 'session-uuid-1',
    userUUID: USER_UUID,
    path: 'CREATE',
    currentStep: 2,
    stepData: { '0': { path: 'CREATE' } },
    invitationCode: null,
    status: 'IN_PROGRESS',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    ...overrides,
  } as OnboardingSessionEntity;
}

describe('OnboardingSessionMapper', () => {
  describe('toDomain', () => {
    describe('Given an entity with CREATE path and COMPLETED status', () => {
      describe('When toDomain is called', () => {
        it('Then it returns a model with CREATE path and COMPLETED status', () => {
          const entity = makeEntity({ path: 'CREATE', status: 'COMPLETED' });

          const model = OnboardingSessionMapper.toDomain(entity);

          expect(model.id).toBe('session-uuid-1');
          expect(model.path).toBe(OnboardingPath.CREATE);
          expect(model.status).toBe(OnboardingStatus.COMPLETED);
          expect(model.currentStep).toBe(2);
          expect(model.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
        });
      });
    });

    describe('Given an entity with JOIN path and IN_PROGRESS status', () => {
      describe('When toDomain is called', () => {
        it('Then it returns a model with JOIN path, IN_PROGRESS status, and the invitation code', () => {
          const entity = makeEntity({ path: 'JOIN', status: 'IN_PROGRESS', invitationCode: 'abc123', currentStep: 0 });

          const model = OnboardingSessionMapper.toDomain(entity);

          expect(model.path).toBe(OnboardingPath.JOIN);
          expect(model.status).toBe(OnboardingStatus.IN_PROGRESS);
          expect(model.invitationCode).toBe('abc123');
        });
      });
    });

    describe('Given an entity with null path', () => {
      describe('When toDomain is called', () => {
        it('Then it returns a model with null path', () => {
          const entity = makeEntity({ path: null as unknown as string, currentStep: 0, stepData: {} });

          const model = OnboardingSessionMapper.toDomain(entity);

          expect(model.path).toBeNull();
        });
      });
    });
  });

  describe('toEntity', () => {
    describe('Given a reconstituted model with an existing id', () => {
      describe('When toEntity is called', () => {
        it('Then the result includes the id and all mapped fields', () => {
          const session = OnboardingSessionModel.reconstitute({
            id: 'session-uuid-existing',
            userUUID: USER_UUID,
            path: OnboardingPath.CREATE,
            currentStep: 1,
            stepData: { '0': { path: 'CREATE' } },
            invitationCode: null,
            status: OnboardingStatus.IN_PROGRESS,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const entity = OnboardingSessionMapper.toEntity(session);

          expect(entity.id).toBe('session-uuid-existing');
          expect(entity.userUUID).toBe(USER_UUID);
          expect(entity.path).toBe(OnboardingPath.CREATE);
          expect(entity.status).toBe(OnboardingStatus.IN_PROGRESS);
          expect(entity.currentStep).toBe(1);
        });
      });
    });

    describe('Given a newly created model with no id', () => {
      describe('When toEntity is called', () => {
        it('Then the result omits the id field', () => {
          const session = OnboardingSessionModel.create({ userUUID: USER_UUID });

          const entity = OnboardingSessionMapper.toEntity(session);

          expect(entity.id).toBeUndefined();
          expect(entity.userUUID).toBe(USER_UUID);
          expect(entity.status).toBe(OnboardingStatus.IN_PROGRESS);
        });
      });
    });
  });
});
