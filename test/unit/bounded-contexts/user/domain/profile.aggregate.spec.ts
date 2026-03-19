import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';

describe('ProfileAggregate', () => {
  describe('Given ProfileAggregate.reconstitute() is called with persisted data', () => {
    describe('When the aggregate is hydrated from storage', () => {
      it('Then all props are preserved', () => {
        const createdAt = new Date('2024-01-01');
        const updatedAt = new Date('2024-02-01');
        const profile = ProfileAggregate.reconstitute({
          id: 5,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          userId: 99,
          createdAt,
          updatedAt,
          archivedAt: null,
        });

        expect(profile.id).toBe(5);
        expect(profile.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(profile.userId).toBe(99);
        expect(profile.createdAt).toEqual(createdAt);
        expect(profile.updatedAt).toEqual(updatedAt);
        expect(profile.archivedAt).toBeNull();
      });

      it('Then userId getter returns the persisted user id', () => {
        const profile = ProfileAggregate.reconstitute({
          id: 7,
          uuid: '660f9511-f30c-4ae5-b827-557766551111',
          userId: 42,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(profile.userId).toBe(42);
      });

      it('Then no uncommitted events are emitted', () => {
        const profile = ProfileAggregate.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(profile.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });
});
