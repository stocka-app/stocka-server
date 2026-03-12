import { Injectable, ExecutionContext, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookAuthenticationGuard extends AuthGuard('facebook') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const isEnabled = this.configService.get<string>('FACEBOOK_AUTHENTICATION_ENABLED') === 'true';

    if (!isEnabled) {
      throw new NotImplementedException(
        'Facebook Login is not available. Contact support for more information.',
      );
    }

    return super.canActivate(context) as boolean;
  }
}
