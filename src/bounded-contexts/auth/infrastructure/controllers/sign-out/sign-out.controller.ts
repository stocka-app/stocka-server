import { Controller, Post, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SignOutCommand } from '@auth/application/commands/sign-out/sign-out.command';
import { clearRefreshCookie } from '@auth/infrastructure/helpers/refresh-cookie.helper';

@ApiTags('Auth')
@Controller('auth')
export class SignOutController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and invalidate all sessions' })
  @ApiResponse({
    status: 200,
    description: 'User successfully signed out',
  })
  async handle(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    let token: string | undefined;
    if (req.cookies && typeof req.cookies === 'object' && 'refresh_token' in req.cookies) {
      token = (req.cookies as Record<string, unknown>)['refresh_token'] as string | undefined;
    } else {
      token = undefined;
    }

    if (token) {
      await this.commandBus.execute(new SignOutCommand(token));
    }

    clearRefreshCookie(res);

    return { message: 'Successfully signed out' };
  }
}
