import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from '@auth/infrastructure/guards/google-auth.guard';
import { SocialSignInCommand } from '@auth/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInResult } from '@auth/application/types/auth-result.types';
import { SocialProfile } from '@auth/infrastructure/strategies/google.strategy';

@ApiTags('Auth')
@Controller('auth')
export class GoogleCallbackController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with tokens',
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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;

    res.redirect(redirectUrl);
  }
}
