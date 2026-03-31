import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Secure } from '@common/decorators/secure.decorator';
import { RefreshSessionCommand } from '@authentication/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionCommandResult } from '@authentication/application/types/authentication-result.types';
import { RefreshSessionOutDto } from '@authentication/infrastructure/controllers/refresh-session/refresh-session-out.dto';
import { setRefreshCookie } from '@authentication/infrastructure/helpers/refresh-cookie.helper';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@ApiTags('Authentication')
@Controller('authentication')
export class RefreshSessionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('refresh-session')
  @Secure()
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

    const result = await this.commandBus.execute<
      RefreshSessionCommand,
      RefreshSessionCommandResult
    >(new RefreshSessionCommand(token));

    return result.match(
      (data) => {
        setRefreshCookie(res, data.refreshToken);
        return {
          accessToken: data.accessToken,
          username: data.username,
          givenName: data.givenName,
          familyName: data.familyName,
          avatarUrl: data.avatarUrl,
          onboardingStatus: data.onboardingStatus,
        };
      },
      (error) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
