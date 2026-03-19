import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GoogleAuthenticationGuard } from '@authentication/infrastructure/guards/google-authentication.guard';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInResult } from '@authentication/application/types/authentication-result.types';
import { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';
import { setRefreshCookie } from '@authentication/infrastructure/helpers/refresh-cookie.helper';
import {
  POPUP_OAUTH_MODE_COOKIE,
  POPUP_OAUTH_MODE_VALUE,
  buildPopupHtmlResponse,
} from '@authentication/infrastructure/helpers/popup-html.helper';

@ApiTags('Authentication')
@Controller('authentication')
export class GoogleCallbackController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthenticationGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with access token',
  })
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as SocialProfile;

    const result = await this.commandBus.execute<SocialSignInCommand, SocialSignInResult>(
      new SocialSignInCommand(
        profile.email,
        profile.displayName,
        profile.provider,
        profile.providerId,
      ),
    );

    setRefreshCookie(res, result.refreshToken);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') as string;

    if (req.cookies?.[POPUP_OAUTH_MODE_COOKIE] === POPUP_OAUTH_MODE_VALUE) {
      res.clearCookie(POPUP_OAUTH_MODE_COOKIE, { path: '/api/authentication' });
      res.send(buildPopupHtmlResponse(result.accessToken, frontendUrl));
    } else {
      res.redirect(`${frontendUrl}/auth/callback?accessToken=${result.accessToken}`);
    }
  }
}
