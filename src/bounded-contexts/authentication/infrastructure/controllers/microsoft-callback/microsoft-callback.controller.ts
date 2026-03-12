import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MicrosoftAuthenticationGuard } from '@authentication/infrastructure/guards/microsoft-authentication.guard';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInResult } from '@authentication/application/types/authentication-result.types';
import { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';
import { setRefreshCookie } from '@authentication/infrastructure/helpers/refresh-cookie.helper';

@ApiTags('Authentication')
@Controller('authentication')
export class MicrosoftCallbackController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Get('microsoft/callback')
  @UseGuards(MicrosoftAuthenticationGuard)
  @ApiOperation({
    summary: 'Microsoft OAuth callback',
    description: 'Handles the callback from Microsoft after user authentication',
  })
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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${result.accessToken}`);
  }
}
