import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import {
  createEmptySnapshot,
  isValidSnapshot,
  CapabilitySnapshot,
} from '@authorization/domain/models/capability-snapshot';

describe('CapabilitySnapshot', () => {
  describe('Given createEmptySnapshot is called', () => {
    describe('When creating a blank snapshot', () => {
      let snapshot: CapabilitySnapshot;

      beforeEach(() => {
        snapshot = createEmptySnapshot();
      });

      it('Then it has an entry for every SystemAction', () => {
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(snapshot[action]).toBeDefined();
        }
      });

      it('Then every action is disabled by default', () => {
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(snapshot[action].enabled).toBe(false);
        }
      });

      it('Then every action has a "Not evaluated" reason', () => {
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(snapshot[action].reason).toBe('Not evaluated');
        }
      });
    });
  });

  describe('Given isValidSnapshot is called', () => {
    describe('When validating a proper snapshot', () => {
      it('Then it returns true for a valid snapshot', () => {
        const snapshot = createEmptySnapshot();
        expect(isValidSnapshot(snapshot)).toBe(true);
      });

      it('Then it returns true for a snapshot with optional reasons', () => {
        const snapshot = createEmptySnapshot();
        snapshot[SystemAction.PRODUCT_READ] = { enabled: true, reason: 'Allowed' };
        expect(isValidSnapshot(snapshot)).toBe(true);
      });

      it('Then it returns true for a snapshot with no reason field', () => {
        const snapshot = createEmptySnapshot();
        snapshot[SystemAction.PRODUCT_READ] = { enabled: true };
        expect(isValidSnapshot(snapshot)).toBe(true);
      });
    });

    describe('When validating invalid values', () => {
      it('Then it returns false for null', () => {
        expect(isValidSnapshot(null)).toBe(false);
      });

      it('Then it returns false for a non-object', () => {
        expect(isValidSnapshot('not-an-object')).toBe(false);
      });

      it('Then it returns false for an empty object', () => {
        expect(isValidSnapshot({})).toBe(false);
      });

      it('Then it returns false when an action entry is not an object', () => {
        const snapshot = createEmptySnapshot();
        (snapshot as Record<string, unknown>)[SystemAction.PRODUCT_READ] = 'invalid';
        expect(isValidSnapshot(snapshot)).toBe(false);
      });

      it('Then it returns false when an action entry is null', () => {
        const snapshot = createEmptySnapshot();
        (snapshot as Record<string, unknown>)[SystemAction.PRODUCT_READ] = null;
        expect(isValidSnapshot(snapshot)).toBe(false);
      });

      it('Then it returns false when the enabled field is not a boolean', () => {
        const snapshot = createEmptySnapshot();
        (snapshot[SystemAction.PRODUCT_READ] as unknown as Record<string, unknown>).enabled = 'yes';
        expect(isValidSnapshot(snapshot)).toBe(false);
      });

      it('Then it returns false when the reason field is not a string', () => {
        const snapshot = createEmptySnapshot();
        (snapshot[SystemAction.PRODUCT_READ] as unknown as Record<string, unknown>).reason = 123;
        expect(isValidSnapshot(snapshot)).toBe(false);
      });
    });
  });
});
