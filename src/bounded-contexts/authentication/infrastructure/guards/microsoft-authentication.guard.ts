import { Injectable, ExecutionContext, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  POPUP_OAUTH_MODE_VALUE,
  setPopupModeCookie,
} from '@authentication/infrastructure/helpers/popup-html.helper';

@Injectable()
export class MicrosoftAuthenticationGuard extends AuthGuard('microsoft') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const isEnabled = this.configService.get<string>('MICROSOFT_AUTHENTICATION_ENABLED') === 'true';

    if (!isEnabled) {
      throw new NotImplementedException(
        'Microsoft Sign-In is not available. Contact support for more information.',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (req.query['mode'] === POPUP_OAUTH_MODE_VALUE) {
      setPopupModeCookie(res);
    }

    return super.canActivate(context) as boolean;
  }
}
