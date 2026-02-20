import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RefreshSessionCommand } from '@auth/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionResult } from '@auth/application/types/auth-result.types';
import { RefreshSessionOutDto } from '@auth/infrastructure/controllers/refresh-session/refresh-session-out.dto';
import { setRefreshCookie } from '@auth/infrastructure/helpers/refresh-cookie.helper';

@ApiTags('Auth')
@Controller('auth')
export class RefreshSessionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('refresh-session')
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiResponse({
    status: 200,
    description: 'Access token successfully refreshed',
    type: RefreshSessionOutDto,
  })
  @ApiResponse({ status: 401, description: 'Token expired, invalid, or missing' })
  async handle(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshSessionOutDto> {
    let token: string | undefined;

    if (req.cookies && typeof req.cookies === 'object') {
      token = (req.cookies as Record<string, unknown>)['refresh_token'] as string | undefined;
    } else {
      token = undefined;
    }

    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.commandBus.execute<RefreshSessionCommand, RefreshSessionResult>(
      new RefreshSessionCommand(token),
    );

    setRefreshCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }
}
