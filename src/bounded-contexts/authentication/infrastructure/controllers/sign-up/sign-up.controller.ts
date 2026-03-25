import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { SignUpCommand } from '@authentication/application/commands/sign-up/sign-up.command';
import { SignUpCommandResult } from '@authentication/application/types/authentication-result.types';
import { SignUpInDto } from '@authentication/infrastructure/controllers/sign-up/sign-up-in.dto';
import {
  SignUpOutDto,
  UserOutDto,
} from '@authentication/infrastructure/controllers/sign-up/sign-up-out.dto';
import { extractLocale } from '@shared/infrastructure/i18n/locale.helper';
import { setRefreshCookie } from '@authentication/infrastructure/helpers/refresh-cookie.helper';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { RateLimit } from '@common/decorators/rate-limit.decorator';

@ApiTags('Authentication')
@Controller('authentication')
export class SignUpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Throttle({
    short: { ttl: 1000, limit: 2 },
    medium: { ttl: 60000, limit: 5 },
  })
  @RateLimit({
    type: 'sign_up',
    maxAttemptsByIp: 10,
    maxAttemptsByIdentifier: 3,
    identifierSource: 'body.email',
    trackFailedAttempts: false,
    progressiveBlock: {
      thresholds: [
        { attempts: 5, blockMinutes: 10 },
        { attempts: 8, blockMinutes: 60 },
      ],
    },
    failureErrorCodes: [],
  })
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
          email: data.credential.email,
          username: data.username,
          createdAt: data.user.createdAt.toISOString(),
        };

        return {
          user: userOut,
          accessToken: data.accessToken,
          emailSent: data.emailSent,
        };
      },
      (error: DomainException) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
