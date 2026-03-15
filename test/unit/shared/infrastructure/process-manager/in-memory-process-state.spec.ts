import { InMemoryProcessStateContract } from '@shared/infrastructure/process-manager/in-memory-process-state';
import { ProcessState, ProcessStatus } from '@shared/domain/process-manager/process-state';

// ── Helper ────────────────────────────────────────────────────────────────────

function buildProcessState(overrides?: Partial<ProcessState>): ProcessState {
  return {
    id: 'ps-1',
    processName: 'sign-up',
    correlationId: 'corr-1',
    status: ProcessStatus.STARTED,
    currentStep: 'validate',
    data: {},
    startedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProcessState;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('InMemoryProcessStateContract', () => {
  let store: InMemoryProcessStateContract;

  beforeEach(() => {
    store = new InMemoryProcessStateContract();
  });

  describe('Given an empty store', () => {
    describe('When findById is called with a non-existent id', () => {
      it('Then it returns null', async () => {
        const result = await store.findById('nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('When findByCorrelationId is called with a non-existent correlationId', () => {
      it('Then it returns null', async () => {
        const result = await store.findByCorrelationId('no-corr');
        expect(result).toBeNull();
      });
    });
  });

  describe('Given a persisted ProcessState', () => {
    let state: ProcessState;

    beforeEach(async () => {
      state = buildProcessState({ id: 'ps-abc', correlationId: 'corr-abc' });
      await store.persist(state);
    });

    describe('When findById is called with the matching id', () => {
      it('Then it returns the persisted state', async () => {
        const result = await store.findById('ps-abc');
        expect(result).toEqual(state);
      });
    });

    describe('When findByCorrelationId is called with the matching correlationId', () => {
      it('Then it returns the persisted state', async () => {
        const result = await store.findByCorrelationId('corr-abc');
        expect(result).toEqual(state);
      });
    });

    describe('When persist is called again with the same id but updated status', () => {
      it('Then it overwrites the existing state and returns the updated one', async () => {
        const updated = buildProcessState({
          id: 'ps-abc',
          correlationId: 'corr-abc',
          status: ProcessStatus.COMPLETED,
        });
        const returned = await store.persist(updated);
        expect(returned.status).toBe(ProcessStatus.COMPLETED);

        const found = await store.findById('ps-abc');
        expect(found?.status).toBe(ProcessStatus.COMPLETED);
      });
    });

    describe('When delete is called with the matching id', () => {
      it('Then the state is removed and findById returns null', async () => {
        await store.delete('ps-abc');
        const result = await store.findById('ps-abc');
        expect(result).toBeNull();
      });
    });
  });

  describe('Given multiple persisted ProcessStates', () => {
    beforeEach(async () => {
      await store.persist(buildProcessState({ id: 'ps-1', correlationId: 'corr-1' }));
      await store.persist(buildProcessState({ id: 'ps-2', correlationId: 'corr-2' }));
    });

    describe('When findByCorrelationId is called for one of the states', () => {
      it('Then it returns only the matching state', async () => {
        const result = await store.findByCorrelationId('corr-2');
        expect(result?.id).toBe('ps-2');
      });
    });

    describe('When delete is called for one state', () => {
      it('Then the other state remains accessible', async () => {
        await store.delete('ps-1');
        const remaining = await store.findById('ps-2');
        expect(remaining).not.toBeNull();
      });
    });
  });

  describe('Given a delete call for a non-existent id', () => {
    it('Then it resolves without throwing', async () => {
      await expect(store.delete('ghost-id')).resolves.toBeUndefined();
    });
  });
});
