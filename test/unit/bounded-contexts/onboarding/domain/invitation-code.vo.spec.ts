import { InvitationCodeVO } from '@onboarding/domain/value-objects/invitation-code.vo';

describe('InvitationCodeVO', () => {
  describe('Given a valid invitation code', () => {
    it('Then create() returns a VO with the trimmed value', () => {
      expect(InvitationCodeVO.create('  abc-123  ').getValue()).toBe('abc-123');
    });
  });

  describe('Given an empty (whitespace-only) input', () => {
    it('Then create() throws "Invitation code cannot be empty"', () => {
      expect(() => InvitationCodeVO.create('   ')).toThrow('Invitation code cannot be empty');
    });
  });

  describe('Given a code longer than 100 characters', () => {
    it('Then create() throws a length-bound error', () => {
      const tooLong = 'a'.repeat(101);
      expect(() => InvitationCodeVO.create(tooLong)).toThrow(
        'Invitation code cannot exceed 100 characters',
      );
    });
  });

  describe('Given a code at the boundary', () => {
    it('Then create() returns a VO without throwing', () => {
      expect(() => InvitationCodeVO.create('a'.repeat(100))).not.toThrow();
    });
  });
});
