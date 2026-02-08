import { Injectable, ExecutionContext, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apple Auth Guard with feature flag support.
 *
 * DISABLED by default - See ADR-001 for details.
 *
 * Apple Sign-In requires Apple Developer Program ($99/year).
 * This guard is kept for future reactivation when Stocka
 * publishes a native iOS app in the App Store.
 */
@Injectable()
export class AppleAuthGuard extends AuthGuard('apple') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const isEnabled = this.configService.get<string>('APPLE_AUTH_ENABLED') === 'true';

    if (!isEnabled) {
      throw new NotImplementedException(
        'Apple Sign-In is not available. See ADR-001 for details. Use Google, Facebook, or Microsoft instead.',
      );
    }

    return super.canActivate(context) as boolean;
  }
}
