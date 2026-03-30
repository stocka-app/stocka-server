import {
  SocialProvider,
  ACTIVE_SOCIAL_PROVIDERS,
  isActiveProvider,
} from '@authentication/domain/enums/social-provider.enum';
import { AttemptedAtVO } from '@authentication/domain/value-objects/attempted-at.vo';
import { IpAddressVO } from '@authentication/domain/value-objects/ip-address.vo';
import { IPv4AddressVO } from '@authentication/domain/value-objects/ipv4-address.vo';
import { IPv6AddressVO } from '@authentication/domain/value-objects/ipv6-address.vo';
import { PasswordVO } from '@authentication/domain/value-objects/password.vo';
import { UserAgentVO } from '@authentication/domain/value-objects/user-agent.vo';
import { VerificationResultVO } from '@authentication/domain/value-objects/verification-result.vo';
import {
  VerificationTypeVO,
  VerificationTypeEnum,
} from '@authentication/domain/value-objects/verification-type.vo';
import { InvalidAttemptedAtException } from '@authentication/domain/exceptions/invalid-attempted-at.exception';
import { InvalidIpAddressException } from '@authentication/domain/exceptions/invalid-ip-address.exception';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';
import { InvalidUserAgentException } from '@authentication/domain/exceptions/invalid-user-agent.exception';
import { InvalidVerificationTypeException } from '@authentication/domain/exceptions/invalid-verification-type.exception';

describe('Authentication domain value objects', () => {
  // ─── AttemptedAtVO ──────────────────────────────────────────────────────────
  describe('AttemptedAtVO', () => {
    describe('Given a past date', () => {
      describe('When constructing the VO', () => {
        it('Then it holds the date value', () => {
          const past = new Date(Date.now() - 1000);
          const vo = new AttemptedAtVO(past);
          expect(vo.toDate().getTime()).toBeCloseTo(past.getTime(), -1);
        });

        it('Then toString returns ISO string', () => {
          const past = new Date(Date.now() - 1000);
          const vo = new AttemptedAtVO(past);
          expect(vo.toString()).toBe(past.toISOString());
        });
      });
    });

    describe('Given a date beyond the 5-second tolerance in the future', () => {
      describe('When constructing the VO', () => {
        it('Then it throws InvalidAttemptedAtException', () => {
          const future = new Date(Date.now() + 10000);
          expect(() => new AttemptedAtVO(future)).toThrow(InvalidAttemptedAtException);
        });
      });
    });

    describe('Given an invalid date (NaN)', () => {
      describe('When constructing the VO', () => {
        it('Then it throws InvalidAttemptedAtException', () => {
          expect(() => new AttemptedAtVO(new Date('not-a-date'))).toThrow(
            InvalidAttemptedAtException,
          );
        });
      });
    });

    describe('Given two AttemptedAtVO instances', () => {
      it('Then equals returns true for same timestamp', () => {
        const date = new Date(Date.now() - 500);
        const a = new AttemptedAtVO(date);
        const b = new AttemptedAtVO(date);
        expect(a.equals(b)).toBe(true);
      });

      it('Then equals returns false for different timestamps', () => {
        const a = new AttemptedAtVO(new Date(Date.now() - 2000));
        const b = new AttemptedAtVO(new Date(Date.now() - 1000));
        expect(a.equals(b)).toBe(false);
      });

      it('Then equals returns false when compared to a non-AttemptedAtVO', () => {
        const a = new AttemptedAtVO(new Date(Date.now() - 1000));
        expect(a.equals(null as unknown as AttemptedAtVO)).toBe(false);
      });

      it('Then isBefore and isAfter work correctly', () => {
        const earlier = new AttemptedAtVO(new Date(Date.now() - 3000));
        const later = new AttemptedAtVO(new Date(Date.now() - 1000));
        expect(earlier.isBefore(later)).toBe(true);
        expect(later.isAfter(earlier)).toBe(true);
        expect(earlier.isAfter(later)).toBe(false);
      });
    });

    describe('When calling now()', () => {
      it('Then it returns a valid AttemptedAtVO with the current time', () => {
        const before = Date.now();
        const vo = AttemptedAtVO.now();
        const after = Date.now();
        expect(vo.toDate().getTime()).toBeGreaterThanOrEqual(before);
        expect(vo.toDate().getTime()).toBeLessThanOrEqual(after);
      });
    });

    describe('Given the toDate method', () => {
      it('Then it should return a defensive copy (not the internal reference)', () => {
        const past = new Date(Date.now() - 1000);
        const vo = new AttemptedAtVO(past);
        const copy1 = vo.toDate();
        const copy2 = vo.toDate();
        expect(copy1).not.toBe(copy2);
        expect(copy1.getTime()).toBe(copy2.getTime());
      });
    });

    describe('Given a date within the 5-second future tolerance', () => {
      describe('When constructing the VO', () => {
        it('Then it should not throw for a date 3 seconds in the future', () => {
          const nearFuture = new Date(Date.now() + 3000);
          expect(() => new AttemptedAtVO(nearFuture)).not.toThrow();
        });
      });
    });

    describe('Given isBefore and isAfter edge cases', () => {
      it('Then isBefore should return false when comparing later to earlier', () => {
        const earlier = new AttemptedAtVO(new Date(Date.now() - 3000));
        const later = new AttemptedAtVO(new Date(Date.now() - 1000));
        expect(later.isBefore(earlier)).toBe(false);
      });

      it('Then isAfter should return false when comparing earlier to later', () => {
        const earlier = new AttemptedAtVO(new Date(Date.now() - 3000));
        const later = new AttemptedAtVO(new Date(Date.now() - 1000));
        expect(earlier.isAfter(later)).toBe(false);
      });

      it('Then isBefore should return false for equal timestamps', () => {
        const date = new Date(Date.now() - 1000);
        const a = new AttemptedAtVO(date);
        const b = new AttemptedAtVO(date);
        expect(a.isBefore(b)).toBe(false);
      });

      it('Then isAfter should return false for equal timestamps', () => {
        const date = new Date(Date.now() - 1000);
        const a = new AttemptedAtVO(date);
        const b = new AttemptedAtVO(date);
        expect(a.isAfter(b)).toBe(false);
      });
    });
  });

  // ─── IpAddressVO ─────────────────────────────────────────────────────────────
  describe('IpAddressVO', () => {
    describe('Given a valid IPv4 address', () => {
      describe('When creating via IpAddressVO.create()', () => {
        it('Then it wraps as IPv4 and isIPv4 returns true', () => {
          const vo = IpAddressVO.create('192.168.0.1');
          expect(vo.isIPv4()).toBe(true);
          expect(vo.isIPv6()).toBe(false);
          expect(vo.toString()).toBe('192.168.0.1');
        });
      });
    });

    describe('Given a valid IPv6 address', () => {
      describe('When creating via IpAddressVO.create()', () => {
        it('Then it wraps as IPv6 and isIPv6 returns true', () => {
          const vo = IpAddressVO.create('2001:db8::1');
          expect(vo.isIPv6()).toBe(true);
          expect(vo.isIPv4()).toBe(false);
        });
      });
    });

    describe('Given an invalid IP string', () => {
      describe('When creating via IpAddressVO.create()', () => {
        it('Then it throws InvalidIpAddressException', () => {
          expect(() => IpAddressVO.create('not-an-ip')).toThrow(InvalidIpAddressException);
        });
      });
    });

    describe('Given fromIPv4 factory', () => {
      it('Then it creates a valid IPv4 wrapper', () => {
        const vo = IpAddressVO.fromIPv4('10.0.0.1');
        expect(vo.isIPv4()).toBe(true);
        expect(vo.toString()).toBe('10.0.0.1');
      });
    });

    describe('Given fromIPv6 factory', () => {
      it('Then it creates a valid IPv6 wrapper', () => {
        const vo = IpAddressVO.fromIPv6('::1');
        expect(vo.isIPv6()).toBe(true);
        expect(vo.toString()).toBe('::1');
      });
    });

    describe('Given two IpAddressVO with the same value', () => {
      it('Then equals returns true', () => {
        const a = IpAddressVO.create('192.168.1.1');
        const b = IpAddressVO.create('192.168.1.1');
        expect(a.equals(b)).toBe(true);
      });
    });

    describe('Given two IpAddressVO with different values', () => {
      it('Then equals returns false', () => {
        const a = IpAddressVO.create('192.168.1.1');
        const b = IpAddressVO.create('10.0.0.1');
        expect(a.equals(b)).toBe(false);
      });
    });

    describe('Given a non-IpAddressVO value', () => {
      it('Then equals returns false', () => {
        const a = IpAddressVO.create('192.168.1.1');
        expect(a.equals(null as unknown as IpAddressVO)).toBe(false);
      });
    });

    describe('Given an IP address with leading/trailing whitespace', () => {
      it('Then create() should trim and resolve IPv4 correctly', () => {
        const vo = IpAddressVO.create('  10.0.0.1  ');
        expect(vo.isIPv4()).toBe(true);
        expect(vo.toString()).toBe('10.0.0.1');
      });

      it('Then create() should trim and resolve IPv6 correctly', () => {
        const vo = IpAddressVO.create('  ::1  ');
        expect(vo.isIPv6()).toBe(true);
      });
    });

    describe('Given various invalid IP strings', () => {
      it('Then create() should throw for an empty string', () => {
        expect(() => IpAddressVO.create('')).toThrow(InvalidIpAddressException);
      });

      it('Then create() should throw for random text', () => {
        expect(() => IpAddressVO.create('hello.world')).toThrow(InvalidIpAddressException);
      });
    });
  });

  // ─── IPv4AddressVO ───────────────────────────────────────────────────────────
  describe('IPv4AddressVO', () => {
    describe('Given a valid IPv4 string', () => {
      it('Then it validates and stores the value', () => {
        const vo = new IPv4AddressVO('0.0.0.0');
        expect(vo.getValue()).toBe('0.0.0.0');
      });
    });

    describe('Given an invalid IPv4 string with out-of-range octets', () => {
      it('Then it throws InvalidIpAddressException', () => {
        expect(() => new IPv4AddressVO('256.0.0.1')).toThrow(InvalidIpAddressException);
      });
    });

    describe('When checking isValid()', () => {
      it('Then it returns true for valid IPv4', () => {
        expect(IPv4AddressVO.isValid('255.255.255.255')).toBe(true);
      });

      it('Then it returns false for a non-IPv4 string', () => {
        expect(IPv4AddressVO.isValid('abc')).toBe(false);
      });

      it('Then it returns false when an octet is non-numeric (4 parts but non-digit chars)', () => {
        // 'abc.0.0.0' has 4 parts — reaches isValidOctet('abc') which returns false at line 11
        expect(IPv4AddressVO.isValid('abc.0.0.0')).toBe(false);
      });
    });
  });

  // ─── IPv6AddressVO ───────────────────────────────────────────────────────────
  describe('IPv6AddressVO', () => {
    describe('Given the loopback address', () => {
      it('Then ::1 is valid', () => {
        const vo = new IPv6AddressVO('::1');
        expect(vo.getValue()).toBe('::1');
      });
    });

    describe('Given the unspecified address', () => {
      it('Then :: is valid', () => {
        expect(() => new IPv6AddressVO('::')).not.toThrow();
      });
    });

    describe('Given a full 8-group IPv6', () => {
      it('Then it is valid', () => {
        const full = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
        expect(() => new IPv6AddressVO(full)).not.toThrow();
      });
    });

    describe('Given a compressed IPv6', () => {
      it('Then 2001:db8::1 is valid', () => {
        expect(() => new IPv6AddressVO('2001:db8::1')).not.toThrow();
      });
    });

    describe('Given multiple :: in the same string', () => {
      it('Then it throws InvalidIpAddressException', () => {
        expect(() => new IPv6AddressVO('2001::db8::1')).toThrow(InvalidIpAddressException);
      });
    });

    describe('Given a totally invalid string', () => {
      it('Then it throws InvalidIpAddressException', () => {
        expect(() => new IPv6AddressVO('not-ipv6')).toThrow(InvalidIpAddressException);
      });
    });

    describe('When checking isValid()', () => {
      it('Then it returns true for valid IPv6', () => {
        expect(IPv6AddressVO.isValid('::1')).toBe(true);
      });

      it('Then it returns false for an invalid string', () => {
        expect(IPv6AddressVO.isValid('gggg::1')).toBe(false);
      });
    });

    describe('Given a compressed IPv6 with 8 combined groups', () => {
      it('Then it is invalid because :: would expand to zero groups', () => {
        // 8 groups on both sides of :: = too many
        expect(IPv6AddressVO.isValid('1:2:3:4:5:6:7::1')).toBe(false);
      });
    });

    describe('Given a compressed IPv6 with :: at the end', () => {
      it('Then it is valid — right side of :: is empty string which becomes []', () => {
        // '1:2:3:4:5:6:7::' → right = '' → rightGroups = [] → covers the right==='' true branch
        expect(IPv6AddressVO.isValid('1:2:3:4:5:6:7::')).toBe(true);
      });
    });

    describe('Given a compressed IPv6 with :: at the start', () => {
      it('Then it is valid — left side of :: is empty string which becomes []', () => {
        expect(IPv6AddressVO.isValid('::1:2:3:4:5:6:7')).toBe(true);
      });
    });

    describe('Given a full 8-group IPv6 with an invalid hex group', () => {
      it('Then it is invalid when a group contains non-hex characters', () => {
        expect(IPv6AddressVO.isValid('2001:0db8:85a3:0000:0000:8a2e:0370:zzzz')).toBe(false);
      });

      it('Then it is invalid when a group has more than 4 hex digits', () => {
        expect(IPv6AddressVO.isValid('2001:0db8:85a3:0000:0000:8a2e:0370:73345')).toBe(false);
      });

      it('Then it is invalid when a group is empty (too few groups effectively)', () => {
        expect(IPv6AddressVO.isValid('2001:0db8:85a3:0000:0000:8a2e:0370:')).toBe(false);
      });
    });

    describe('Given a full 8-group IPv6 with too few groups (no ::)', () => {
      it('Then it is invalid with only 7 groups', () => {
        expect(IPv6AddressVO.isValid('2001:0db8:85a3:0000:0000:8a2e:0370')).toBe(false);
      });

      it('Then it is invalid with 9 groups', () => {
        expect(IPv6AddressVO.isValid('2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra')).toBe(false);
      });
    });

    describe('Given a compressed IPv6 with invalid hex in left groups', () => {
      it('Then it is invalid', () => {
        expect(IPv6AddressVO.isValid('zzzz::1')).toBe(false);
      });
    });

    describe('Given a compressed IPv6 with invalid hex in right groups', () => {
      it('Then it is invalid', () => {
        expect(IPv6AddressVO.isValid('2001::zzzz')).toBe(false);
      });
    });

    describe('Given IPv6AddressVO constructor', () => {
      it('Then it should normalize to lowercase', () => {
        const vo = new IPv6AddressVO('2001:DB8::1');
        expect(vo.getValue()).toBe('2001:db8::1');
      });

      it('Then it should trim whitespace', () => {
        const vo = new IPv6AddressVO('  ::1  ');
        expect(vo.getValue()).toBe('::1');
      });
    });

    describe('Given IPv6AddressVO.isValid with whitespace', () => {
      it('Then it should trim and validate correctly', () => {
        expect(IPv6AddressVO.isValid('  ::1  ')).toBe(true);
      });
    });
  });

  // ─── PasswordVO ──────────────────────────────────────────────────────────────
  describe('PasswordVO', () => {
    describe('Given a valid password meeting all policy requirements', () => {
      it('Then it constructs without error', () => {
        expect(() => new PasswordVO('StrongPass1!')).not.toThrow();
      });
    });

    describe('Given a password that is too short', () => {
      it('Then it throws InvalidPasswordException', () => {
        expect(() => new PasswordVO('Pw1!')).toThrow(InvalidPasswordException);
      });
    });

    describe('Given a password with no uppercase letter', () => {
      it('Then it throws InvalidPasswordException', () => {
        expect(() => new PasswordVO('password1234!')).toThrow(InvalidPasswordException);
      });
    });

    describe('Given a password with no digit', () => {
      it('Then it throws InvalidPasswordException', () => {
        expect(() => new PasswordVO('PasswordOnly!')).toThrow(InvalidPasswordException);
      });
    });

    describe('Given a password with no special character', () => {
      it('Then it throws InvalidPasswordException', () => {
        expect(() => new PasswordVO('StrongPass1234')).toThrow(InvalidPasswordException);
      });
    });
  });

  // ─── UserAgentVO ─────────────────────────────────────────────────────────────
  describe('UserAgentVO', () => {
    describe('Given a typical browser user agent string', () => {
      it('Then it constructs without error', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
        expect(() => new UserAgentVO(ua)).not.toThrow();
      });
    });

    describe('Given an empty string', () => {
      it('Then it throws InvalidUserAgentException', () => {
        expect(() => new UserAgentVO('')).toThrow(InvalidUserAgentException);
      });
    });

    describe('Given a string exceeding 512 characters', () => {
      it('Then it throws InvalidUserAgentException', () => {
        const longUa = 'A'.repeat(513);
        expect(() => new UserAgentVO(longUa)).toThrow(InvalidUserAgentException);
      });
    });

    describe('Given a string of exactly 512 characters', () => {
      it('Then it constructs without error', () => {
        const maxUa = 'A'.repeat(512);
        expect(() => new UserAgentVO(maxUa)).not.toThrow();
      });
    });
  });

  // ─── VerificationResultVO ────────────────────────────────────────────────────
  describe('VerificationResultVO', () => {
    describe('When using the success() factory', () => {
      it('Then isSuccessful returns true and isFailed returns false', () => {
        const vo = VerificationResultVO.success();
        expect(vo.isSuccessful()).toBe(true);
        expect(vo.isFailed()).toBe(false);
        expect(vo.toString()).toBe('success');
      });
    });

    describe('When using the failed() factory', () => {
      it('Then isFailed returns true and isSuccessful returns false', () => {
        const vo = VerificationResultVO.failed();
        expect(vo.isFailed()).toBe(true);
        expect(vo.isSuccessful()).toBe(false);
        expect(vo.toString()).toBe('failed');
      });
    });

    describe('When using fromBoolean(true)', () => {
      it('Then it returns a successful result', () => {
        const vo = VerificationResultVO.fromBoolean(true);
        expect(vo.isSuccessful()).toBe(true);
      });
    });

    describe('When using fromBoolean(false)', () => {
      it('Then it returns a failed result', () => {
        const vo = VerificationResultVO.fromBoolean(false);
        expect(vo.isFailed()).toBe(true);
      });
    });

    describe('Given two results with the same value', () => {
      it('Then equals returns true', () => {
        const a = VerificationResultVO.success();
        const b = VerificationResultVO.success();
        expect(a.equals(b)).toBe(true);
      });
    });

    describe('Given two results with different values', () => {
      it('Then equals returns false', () => {
        const a = VerificationResultVO.success();
        const b = VerificationResultVO.failed();
        expect(a.equals(b)).toBe(false);
      });
    });

    describe('Given a non-VerificationResultVO value', () => {
      it('Then equals returns false', () => {
        const a = VerificationResultVO.success();
        expect(a.equals(null as unknown as VerificationResultVO)).toBe(false);
      });
    });
  });

  // ─── VerificationTypeVO ──────────────────────────────────────────────────────
  describe('VerificationTypeVO', () => {
    describe('Given the email_verification type', () => {
      it('Then isEmailVerification returns true', () => {
        const vo = new VerificationTypeVO(VerificationTypeEnum.EMAIL_VERIFICATION);
        expect(vo.isEmailVerification()).toBe(true);
        expect(vo.isPasswordReset()).toBe(false);
        expect(vo.isTwoFactor()).toBe(false);
        expect(vo.isSignIn()).toBe(false);
      });
    });

    describe('Given the password_reset type', () => {
      it('Then isPasswordReset returns true', () => {
        const vo = VerificationTypeVO.passwordReset();
        expect(vo.isPasswordReset()).toBe(true);
      });
    });

    describe('Given the two_factor type', () => {
      it('Then isTwoFactor returns true', () => {
        const vo = VerificationTypeVO.twoFactor();
        expect(vo.isTwoFactor()).toBe(true);
      });
    });

    describe('Given the sign_in type', () => {
      it('Then isSignIn returns true', () => {
        const vo = VerificationTypeVO.signIn();
        expect(vo.isSignIn()).toBe(true);
      });
    });

    describe('Given an invalid type string', () => {
      it('Then it throws InvalidVerificationTypeException', () => {
        expect(() => new VerificationTypeVO('unknown')).toThrow(InvalidVerificationTypeException);
      });
    });

    describe('Given the static emailVerification() factory', () => {
      it('Then it creates a valid VO with toString equal to email_verification', () => {
        const vo = VerificationTypeVO.emailVerification();
        expect(vo.toString()).toBe('email_verification');
      });
    });

    describe('Given two VOs with the same value', () => {
      it('Then equals returns true', () => {
        const a = VerificationTypeVO.emailVerification();
        const b = VerificationTypeVO.emailVerification();
        expect(a.equals(b)).toBe(true);
      });
    });

    describe('Given two VOs with different values', () => {
      it('Then equals returns false', () => {
        const a = VerificationTypeVO.emailVerification();
        const b = VerificationTypeVO.passwordReset();
        expect(a.equals(b)).toBe(false);
      });
    });

    describe('Given a non-VerificationTypeVO value', () => {
      it('Then equals returns false', () => {
        const a = VerificationTypeVO.emailVerification();
        expect(a.equals(null as unknown as VerificationTypeVO)).toBe(false);
      });

      it('Then equals returns false for a plain object', () => {
        const a = VerificationTypeVO.emailVerification();
        expect(a.equals({} as unknown as VerificationTypeVO)).toBe(false);
      });
    });

    describe('Given toString on each type', () => {
      it('Then password_reset toString returns the correct string', () => {
        expect(VerificationTypeVO.passwordReset().toString()).toBe('password_reset');
      });

      it('Then two_factor toString returns the correct string', () => {
        expect(VerificationTypeVO.twoFactor().toString()).toBe('two_factor');
      });

      it('Then sign_in toString returns the correct string', () => {
        expect(VerificationTypeVO.signIn().toString()).toBe('sign_in');
      });
    });

    describe('Given boolean type checkers return false for non-matching types', () => {
      it('Then password_reset is not email verification', () => {
        const vo = VerificationTypeVO.passwordReset();
        expect(vo.isEmailVerification()).toBe(false);
        expect(vo.isTwoFactor()).toBe(false);
        expect(vo.isSignIn()).toBe(false);
      });

      it('Then two_factor is not password reset or sign in', () => {
        const vo = VerificationTypeVO.twoFactor();
        expect(vo.isEmailVerification()).toBe(false);
        expect(vo.isPasswordReset()).toBe(false);
        expect(vo.isSignIn()).toBe(false);
      });

      it('Then sign_in is not email verification or two factor', () => {
        const vo = VerificationTypeVO.signIn();
        expect(vo.isEmailVerification()).toBe(false);
        expect(vo.isPasswordReset()).toBe(false);
        expect(vo.isTwoFactor()).toBe(false);
      });
    });

    describe('Given the constructor with enum values directly', () => {
      it('Then it should accept all valid enum values', () => {
        expect(() => new VerificationTypeVO(VerificationTypeEnum.PASSWORD_RESET)).not.toThrow();
        expect(() => new VerificationTypeVO(VerificationTypeEnum.TWO_FACTOR)).not.toThrow();
        expect(() => new VerificationTypeVO(VerificationTypeEnum.SIGN_IN)).not.toThrow();
      });
    });
  });
});

// ─── SocialProvider enum ─────────────────────────────────────────────────────
describe('SocialProvider enum', () => {
  describe('Given the active providers list', () => {
    it('Then ACTIVE_SOCIAL_PROVIDERS contains google, facebook, and microsoft', () => {
      expect(ACTIVE_SOCIAL_PROVIDERS).toContain(SocialProvider.GOOGLE);
      expect(ACTIVE_SOCIAL_PROVIDERS).toContain(SocialProvider.FACEBOOK);
      expect(ACTIVE_SOCIAL_PROVIDERS).toContain(SocialProvider.MICROSOFT);
      expect(ACTIVE_SOCIAL_PROVIDERS).not.toContain(SocialProvider.APPLE);
    });
  });

  describe('Given isActiveProvider()', () => {
    it('Then it returns true for google', () => {
      expect(isActiveProvider('google')).toBe(true);
    });

    it('Then it returns true for facebook', () => {
      expect(isActiveProvider('facebook')).toBe(true);
    });

    it('Then it returns true for microsoft', () => {
      expect(isActiveProvider('microsoft')).toBe(true);
    });

    it('Then it returns false for apple (disabled provider)', () => {
      expect(isActiveProvider('apple')).toBe(false);
    });

    it('Then it returns false for an unknown provider', () => {
      expect(isActiveProvider('twitter')).toBe(false);
    });
  });
});
