import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { EmailAlreadyExistsException } from '@authentication/domain/exceptions/email-already-exists.exception';
import { EmailDeliveryFailedException } from '@authentication/domain/exceptions/email-delivery-failed.exception';
import { RateLimitExceededException } from '@authentication/domain/exceptions/rate-limit-exceeded.exception';
import { TooManyVerificationAttemptsException } from '@authentication/domain/exceptions/too-many-verification-attempts.exception';
import { VerificationBlockedException } from '@authentication/domain/exceptions/verification-blocked.exception';
import { VerificationCodeExpiredException } from '@authentication/domain/exceptions/verification-code-expired.exception';
import { EmailNotVerifiedException } from '@authentication/domain/exceptions/email-not-verified.exception';
import { InvalidAttemptedAtException } from '@authentication/domain/exceptions/invalid-attempted-at.exception';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { InvalidIpAddressException } from '@authentication/domain/exceptions/invalid-ip-address.exception';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';
import { InvalidUserAgentException } from '@authentication/domain/exceptions/invalid-user-agent.exception';
import { InvalidVerificationCodeException } from '@authentication/domain/exceptions/invalid-verification-code.exception';
import { InvalidVerificationTypeException } from '@authentication/domain/exceptions/invalid-verification-type.exception';
import { MaxResendsExceededException } from '@authentication/domain/exceptions/max-resends-exceeded.exception';
import { ResendCooldownActiveException } from '@authentication/domain/exceptions/resend-cooldown-active.exception';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { UserAlreadyVerifiedException } from '@authentication/domain/exceptions/user-already-verified.exception';
import { UsernameAlreadyExistsException } from '@authentication/domain/exceptions/username-already-exists.exception';

describe('Authentication domain exceptions', () => {
  describe('Given EmailDeliveryFailedException', () => {
    describe('When instantiated without a reason', () => {
      it('Then it has the correct error code', () => {
        const ex = new EmailDeliveryFailedException();
        expect(ex.errorCode).toBe('EMAIL_DELIVERY_FAILED');
      });

      it('Then it has the default message', () => {
        const ex = new EmailDeliveryFailedException();
        expect(ex.message).toContain('Failed to send verification email');
      });
    });

    describe('When instantiated with a custom reason', () => {
      it('Then it uses the custom reason as the message', () => {
        const ex = new EmailDeliveryFailedException('SMTP unreachable');
        expect(ex.message).toBe('SMTP unreachable');
        expect(ex.errorCode).toBe('EMAIL_DELIVERY_FAILED');
      });
    });
  });

  describe('Given RateLimitExceededException', () => {
    describe('When the limit type is ip', () => {
      it('Then it reports RATE_LIMIT_EXCEEDED with an IP message', () => {
        const ex = new RateLimitExceededException('ip');
        expect(ex.errorCode).toBe('RATE_LIMIT_EXCEEDED');
        expect(ex.message).toContain('IP address');
      });
    });

    describe('When the limit type is email', () => {
      it('Then it reports RATE_LIMIT_EXCEEDED with an email message', () => {
        const ex = new RateLimitExceededException('email');
        expect(ex.errorCode).toBe('RATE_LIMIT_EXCEEDED');
        expect(ex.message).toContain('email');
      });
    });
  });

  describe('Given TooManyVerificationAttemptsException', () => {
    describe('When there is one attempt remaining', () => {
      it('Then it uses singular form', () => {
        const ex = new TooManyVerificationAttemptsException(1);
        expect(ex.errorCode).toBe('TOO_MANY_VERIFICATION_ATTEMPTS');
        expect(ex.message).toContain('1 attempt remaining');
      });
    });

    describe('When there are multiple attempts remaining', () => {
      it('Then it uses plural form', () => {
        const ex = new TooManyVerificationAttemptsException(3);
        expect(ex.errorCode).toBe('TOO_MANY_VERIFICATION_ATTEMPTS');
        expect(ex.message).toContain('3 attempts remaining');
      });
    });
  });

  describe('Given VerificationBlockedException', () => {
    describe('When the block expires in the future', () => {
      it('Then it calculates minutes remaining and includes the error code', () => {
        const blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        const ex = new VerificationBlockedException(blockedUntil);
        expect(ex.errorCode).toBe('VERIFICATION_BLOCKED');
        expect(ex.message).toMatch(/\d+ minute/);
      });

      it('Then the message is singular when exactly 1 minute remains', () => {
        // Covers the ternary minutesRemaining === 1 ? '' : 's' — the TRUE branch (singular)
        const blockedUntil = new Date(Date.now() + 60 * 1000);
        const ex = new VerificationBlockedException(blockedUntil);
        expect(ex.message).toMatch(/1 minute$/);
      });
    });
  });

  describe('Given EmailNotVerifiedException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new EmailNotVerifiedException();
        expect(ex.errorCode).toBe('EMAIL_NOT_VERIFIED');
        expect(ex.message).toContain('Email verification required');
      });
    });
  });

  describe('Given InvalidAttemptedAtException', () => {
    describe('When instantiated with a message', () => {
      it('Then it carries the message and correct error code', () => {
        const ex = new InvalidAttemptedAtException('Attempted at date is invalid');
        expect(ex.errorCode).toBe('INVALID_ATTEMPTED_AT');
        expect(ex.message).toBe('Attempted at date is invalid');
      });
    });
  });

  describe('Given InvalidIpAddressException', () => {
    describe('When instantiated with an IP value', () => {
      it('Then it carries the IP in the message and correct error code', () => {
        const ex = new InvalidIpAddressException('999.999.999.999');
        expect(ex.errorCode).toBe('INVALID_IP_ADDRESS');
        expect(ex.message).toContain('999.999.999.999');
      });
    });
  });

  describe('Given InvalidUserAgentException', () => {
    describe('When instantiated with a message', () => {
      it('Then it carries the message and correct error code', () => {
        const ex = new InvalidUserAgentException('User agent cannot be empty');
        expect(ex.errorCode).toBe('INVALID_USER_AGENT');
        expect(ex.message).toBe('User agent cannot be empty');
      });
    });
  });

  describe('Given InvalidVerificationTypeException', () => {
    describe('When instantiated with an invalid type value', () => {
      it('Then it carries the value in the message and correct error code', () => {
        const ex = new InvalidVerificationTypeException('unknown_type');
        expect(ex.errorCode).toBe('INVALID_VERIFICATION_TYPE');
        expect(ex.message).toContain('unknown_type');
      });
    });
  });

  describe('Given MaxResendsExceededException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new MaxResendsExceededException();
        expect(ex.errorCode).toBe('MAX_RESENDS_EXCEEDED');
        expect(ex.message).toContain('Maximum number');
      });
    });
  });

  describe('Given ResendCooldownActiveException', () => {
    describe('When instantiated with seconds remaining', () => {
      it('Then it includes the seconds in the message and correct error code', () => {
        const ex = new ResendCooldownActiveException(60);
        expect(ex.errorCode).toBe('RESEND_COOLDOWN_ACTIVE');
        expect(ex.message).toContain('60');
      });
    });
  });

  describe('Given UsernameAlreadyExistsException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new UsernameAlreadyExistsException();
        expect(ex.errorCode).toBe('USERNAME_ALREADY_EXISTS');
        expect(ex.message).toContain('Username already taken');
      });
    });
  });

  describe('Given AccountDeactivatedException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new AccountDeactivatedException();
        expect(ex.errorCode).toBe('ACCOUNT_DEACTIVATED');
        expect(ex.message).toBe('Account has been deactivated');
      });
    });
  });

  describe('Given VerificationCodeExpiredException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and field details', () => {
        const ex = new VerificationCodeExpiredException();
        expect(ex.errorCode).toBe('VERIFICATION_CODE_EXPIRED');
        expect(ex.message).toBe('Verification code has expired');
      });
    });
  });

  describe('Given InvalidPasswordException', () => {
    describe('When instantiated without arguments', () => {
      it('Then it uses the default message', () => {
        const ex = new InvalidPasswordException();
        expect(ex.errorCode).toBe('INVALID_PASSWORD');
        expect(ex.message).toBe('Invalid password');
      });
    });

    describe('When instantiated with a custom message', () => {
      it('Then it uses the provided message', () => {
        const ex = new InvalidPasswordException('Password too short');
        expect(ex.errorCode).toBe('INVALID_PASSWORD');
        expect(ex.message).toBe('Password too short');
      });
    });
  });

  describe('Given EmailAlreadyExistsException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new EmailAlreadyExistsException();
        expect(ex.errorCode).toBe('EMAIL_ALREADY_EXISTS');
        expect(ex.message).toBe('This email is already registered');
      });
    });
  });

  describe('Given InvalidCredentialsException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new InvalidCredentialsException();
        expect(ex.errorCode).toBe('INVALID_CREDENTIALS');
        expect(ex.message).toBe('Invalid credentials');
      });
    });
  });

  describe('Given InvalidVerificationCodeException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new InvalidVerificationCodeException();
        expect(ex.errorCode).toBe('INVALID_VERIFICATION_CODE');
        expect(ex.message).toBe('Invalid verification code');
      });
    });
  });

  describe('Given TokenExpiredException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new TokenExpiredException();
        expect(ex.errorCode).toBe('TOKEN_EXPIRED');
        expect(ex.message).toBe('Token has expired');
      });
    });
  });

  describe('Given UserAlreadyVerifiedException', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const ex = new UserAlreadyVerifiedException();
        expect(ex.errorCode).toBe('USER_ALREADY_VERIFIED');
        expect(ex.message).toBe('User email is already verified');
      });
    });
  });
});
