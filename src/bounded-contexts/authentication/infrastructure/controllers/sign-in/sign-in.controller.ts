import { Controller, Post, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { SignInCommand } from '@authentication/application/commands/sign-in/sign-in.command';
import { SignInCommandResult } from '@authentication/application/types/authentication-result.types';
import { SignInInDto } from '@authentication/infrastructure/controllers/sign-in/sign-in-in.dto';
import {
  SignInOutDto,
  SignInUserOutDto,
} from '@authentication/infrastructure/controllers/sign-in/sign-in-out.dto';
import { setRefreshCookie } from '@authentication/infrastructure/helpers/refresh-cookie.helper';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@ApiTags('Authentication')
@Controller('authentication')
export class SignInController {
  constructor(private readonly commandBus: CommandBus) {}

  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 5 },
  })
  @RateLimit({
    type: 'sign_in',
    maxAttemptsByIp: 30,
    maxAttemptsByIdentifier: 15,
    identifierSource: 'body.emailOrUsername',
    trackFailedAttempts: true,
    progressiveBlock: {
      thresholds: [
        { attempts: 7, blockMinutes: 5 },
        { attempts: 10, blockMinutes: 15 },
        { attempts: 15, blockMinutes: 60 },
        { attempts: 20, blockMinutes: 1440 },
      ],
    },
    failureErrorCodes: ['INVALID_CREDENTIALS'],
  })
  @Post('sign-in')
  @Secure()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email/username and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully signed in',
    type: SignInOutDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts or rate limit exceeded' })
  async handle(
    @Body() dto: SignInInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignInOutDto> {
    const result = await this.commandBus.execute<SignInCommand, SignInCommandResult>(
      new SignInCommand(dto.emailOrUsername, dto.password),
    );

    return result.match(
      (data) => {
        setRefreshCookie(res, data.refreshToken);

        const userOut: SignInUserOutDto = {
          id: data.user.uuid,
          email: data.credential.email,
          username: data.username,
          createdAt: data.user.createdAt.toISOString(),
          givenName: data.givenName,
          familyName: data.familyName,
          avatarUrl: data.avatarUrl,
        };

        return {
          user: userOut,
          accessToken: data.accessToken,
          emailVerificationRequired: data.emailVerificationRequired,
          onboardingStatus: data.onboardingStatus,
        };
      },
      (error) => {
        throw mapDomainErrorToHttp(error);
      },
    );
  }
}
