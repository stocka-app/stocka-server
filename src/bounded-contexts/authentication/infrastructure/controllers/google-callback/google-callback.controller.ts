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
import { isPopupState } from '@authentication/infrastructure/helpers/popup-state-store';

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
        profile.givenName,
        profile.familyName,
        profile.avatarUrl,
        profile.locale,
        profile.emailVerified,
        profile.jobTitle,
        profile.rawData,
      ),
    );

    setRefreshCookie(res, result.refreshToken);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') as string;
    const state = req.query['state'] as string | undefined;

    if (isPopupState(state)) {
      res.redirect(
        `${frontendUrl}/authentication/callback?accessToken=${result.accessToken}&popup=true`,
      );
    } else {
      res.redirect(`${frontendUrl}/authentication/callback?accessToken=${result.accessToken}`);
    }
  }
}
