import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { FacebookAuthenticationGuard } from '@authentication/infrastructure/guards/facebook-authentication.guard';
import { Secure } from '@common/decorators/secure.decorator';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInCommandResult } from '@authentication/application/types/authentication-result.types';
import { SocialProfile } from '@authentication/infrastructure/strategies/google.strategy';
import { setRefreshCookie } from '@authentication/infrastructure/helpers/refresh-cookie.helper';

@ApiTags('Authentication')
@Controller('authentication')
export class FacebookCallbackController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Get('facebook/callback')
  @Secure()
  @UseGuards(FacebookAuthenticationGuard)
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with access token',
  })
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const profile = req.user as SocialProfile;

    const result = await this.commandBus.execute<SocialSignInCommand, SocialSignInCommandResult>(
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

    return result.match(
      (data) => {
        setRefreshCookie(res, data.refreshToken);

        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        res.redirect(`${frontendUrl}/auth/callback?accessToken=${data.accessToken}`);
      },
      (error) => {
        throw error;
      },
    );
  }
}
