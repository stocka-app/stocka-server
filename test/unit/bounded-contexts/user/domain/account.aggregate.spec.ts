import { AccountAggregate } from '@user/account/domain/account.aggregate';

describe('AccountAggregate', () => {
  describe('Given AccountAggregate.create() is called with a userId', () => {
    describe('When a new account is created', () => {
      it('Then the account stores the userId and has no id (not yet persisted)', () => {
        const account = AccountAggregate.create({ userId: 77 });

        expect(account.userId).toBe(77);
        expect(account.id).toBeUndefined();
      });

      it('Then the account has a generated uuid', () => {
        const account = AccountAggregate.create({ userId: 1 });

        expect(account.uuid).toBeDefined();
        expect(account.uuid.length).toBeGreaterThan(0);
      });

      it('Then the account is not archived', () => {
        const account = AccountAggregate.create({ userId: 1 });

        expect(account.isArchived()).toBe(false);
      });
    });
  });

  describe('Given AccountAggregate.reconstitute() is called with persisted data', () => {
    describe('When the aggregate is hydrated from storage', () => {
      it('Then all props are preserved', () => {
        const createdAt = new Date('2024-01-01');
        const updatedAt = new Date('2024-02-01');
        const account = AccountAggregate.reconstitute({
          id: 3,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          userId: 42,
          createdAt,
          updatedAt,
          archivedAt: null,
        });

        expect(account.id).toBe(3);
        expect(account.uuid.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(account.userId).toBe(42);
        expect(account.createdAt).toEqual(createdAt);
        expect(account.updatedAt).toEqual(updatedAt);
        expect(account.archivedAt).toBeNull();
      });
    });
  });
});
