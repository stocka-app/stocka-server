import { Injectable, ExecutionContext, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const isEnabled = this.configService.get<string>('GOOGLE_AUTH_ENABLED') === 'true';

    if (!isEnabled) {
      throw new NotImplementedException(
        'Google Sign-In is not available. Contact support for more information.',
      );
    }

    return super.canActivate(context) as boolean;
  }
}
