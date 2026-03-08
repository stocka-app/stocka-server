import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SignUpCommand } from '@auth/application/commands/sign-up/sign-up.command';
import { SignUpCommandResult } from '@auth/application/types/auth-result.types';
import { SignUpInDto } from '@auth/infrastructure/controllers/sign-up/sign-up-in.dto';
import { SignUpOutDto, UserOutDto } from '@auth/infrastructure/controllers/sign-up/sign-up-out.dto';
import { extractLocale } from '@shared/infrastructure/i18n/locale.helper';
import { setRefreshCookie } from '@auth/infrastructure/helpers/refresh-cookie.helper';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@ApiTags('Auth')
@Controller('auth')
export class SignUpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: SignUpOutDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async handle(
    @Body() dto: SignUpInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignUpOutDto> {
    const lang = extractLocale(req.headers as Record<string, string | string[] | undefined>);

    const result = await this.commandBus.execute<SignUpCommand, SignUpCommandResult>(
      new SignUpCommand(dto.email, dto.username, dto.password, lang),
    );

    return result.match(
      (data) => {
        setRefreshCookie(res, data.refreshToken);

        const userOut: UserOutDto = {
          id: data.user.uuid,
          email: data.user.email,
          username: data.user.username,
          createdAt: data.user.createdAt.toISOString(),
        };

        return {
          user: userOut,
          accessToken: data.accessToken,
        };
      },
      (error) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
