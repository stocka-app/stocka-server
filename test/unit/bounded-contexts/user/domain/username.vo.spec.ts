import { UsernameVO } from '@user/domain/value-objects/username.vo';
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from '@common/constants/validation.constants';

describe('UsernameVO', () => {
  describe('Given a valid username', () => {
    describe('When constructing with an alphanumeric string', () => {
      it('Then it is created successfully and trims whitespace', () => {
        const vo = new UsernameVO('  validuser  ');

        expect(vo.getValue()).toBe('validuser');
      });

      it('Then it accepts underscores in the username', () => {
        const vo = new UsernameVO('valid_user_123');

        expect(vo.getValue()).toBe('valid_user_123');
      });

      it('Then it accepts a username at exactly the minimum length', () => {
        const minUsername = 'a'.repeat(USERNAME_MIN_LENGTH);
        const vo = new UsernameVO(minUsername);

        expect(vo.getValue()).toBe(minUsername);
      });

      it('Then it accepts a username at exactly the maximum length', () => {
        const maxUsername = 'a'.repeat(USERNAME_MAX_LENGTH);
        const vo = new UsernameVO(maxUsername);

        expect(vo.getValue()).toBe(maxUsername);
      });
    });
  });

  describe('Given a username that is too short', () => {
    describe('When the username has fewer than the minimum required characters', () => {
      it('Then it throws INVALID_USERNAME with a minimum length message', () => {
        const tooShort = 'a'.repeat(USERNAME_MIN_LENGTH - 1);

        expect(() => new UsernameVO(tooShort)).toThrow(
          `Username must be at least ${USERNAME_MIN_LENGTH} characters long`,
        );
      });
    });

    describe('When the username is empty after trimming', () => {
      it('Then it throws INVALID_USERNAME with a minimum length message', () => {
        expect(() => new UsernameVO('  ')).toThrow(
          `Username must be at least ${USERNAME_MIN_LENGTH} characters long`,
        );
      });
    });
  });

  describe('Given a username that exceeds the maximum length', () => {
    describe('When the username has more characters than allowed', () => {
      it('Then it throws INVALID_USERNAME with a maximum length message', () => {
        const tooLong = 'a'.repeat(USERNAME_MAX_LENGTH + 1);

        expect(() => new UsernameVO(tooLong)).toThrow(
          `Username must not exceed ${USERNAME_MAX_LENGTH} characters`,
        );
      });
    });
  });

  describe('Given a username with invalid characters', () => {
    describe('When the username contains spaces or special characters', () => {
      it('Then it rejects usernames with special characters', () => {
        expect(() => new UsernameVO('invalid-user!')).toThrow(
          'Username can only contain letters, numbers, and underscores',
        );
      });

      it('Then it rejects usernames with hyphens', () => {
        expect(() => new UsernameVO('bad-name')).toThrow(
          'Username can only contain letters, numbers, and underscores',
        );
      });

      it('Then it rejects usernames with spaces in the middle', () => {
        expect(() => new UsernameVO('bad name')).toThrow(
          'Username can only contain letters, numbers, and underscores',
        );
      });

      it('Then it rejects usernames with dots', () => {
        expect(() => new UsernameVO('user.name')).toThrow(
          'Username can only contain letters, numbers, and underscores',
        );
      });
    });
  });

  describe('toString', () => {
    it('should return the string representation of the username', () => {
      const vo = new UsernameVO('myuser');

      expect(vo.toString()).toBe('myuser');
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same username', () => {
      const vo1 = new UsernameVO('sameuser');
      const vo2 = new UsernameVO('sameuser');

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different usernames', () => {
      const vo1 = new UsernameVO('user_one');
      const vo2 = new UsernameVO('user_two');

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false when compared to a non-UsernameVO', () => {
      const vo = new UsernameVO('myuser');

      expect(vo.equals(null as unknown as UsernameVO)).toBe(false);
    });
  });
});
