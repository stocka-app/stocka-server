import { Controller, Post, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefreshSessionCommand } from '@/auth/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionResult } from '@/auth/application/types/auth-result.types';
import { RefreshSessionInDto } from '@/auth/infrastructure/controllers/refresh-session/refresh-session-in.dto';
import { RefreshSessionOutDto } from '@/auth/infrastructure/controllers/refresh-session/refresh-session-out.dto';

@ApiTags('Auth')
@Controller('auth')
export class RefreshSessionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('refresh-session')
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
    type: RefreshSessionOutDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Token expired or invalid' })
  async handle(@Body() dto: RefreshSessionInDto): Promise<RefreshSessionOutDto> {
    const result = await this.commandBus.execute<RefreshSessionCommand, RefreshSessionResult>(
      new RefreshSessionCommand(dto.refreshToken),
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }
}
