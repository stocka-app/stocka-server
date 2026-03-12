import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { SKIP_EMAIL_VERIFICATION_KEY } from '@authentication/infrastructure/guards/email-verified.guard';

/**
 * Decorator to skip email verification check on specific routes.
 * Use this for routes that unverified users should still be able to access.
 *
 * @example
 * @SkipEmailVerification()
 * @Get('profile/basic')
 * getBasicProfile() { ... }
 */
export const SkipEmailVerification = (): CustomDecorator<string> =>
  SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);
