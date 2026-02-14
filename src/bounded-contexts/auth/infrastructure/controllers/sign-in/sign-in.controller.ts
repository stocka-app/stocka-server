import { Controller, Post, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { SignInCommand } from '@/auth/application/commands/sign-in/sign-in.command';
import { SignInInDto } from '@/auth/infrastructure/controllers/sign-in/sign-in-in.dto';
import { SignInOutDto } from '@/auth/infrastructure/controllers/sign-in/sign-in-out.dto';
import { UserOutDto } from '@/auth/infrastructure/controllers/sign-up/sign-up-out.dto';
import { UserModel } from '@/user/domain/models/user.model';

interface SignInResult {
  user: UserModel;
  accessToken: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
}

@ApiTags('Auth')
@Controller('auth')
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
  @ApiOperation({ summary: 'Sign in with email/username and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully signed in',
    type: SignInOutDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts or rate limit exceeded' })
  async handle(@Body() dto: SignInInDto): Promise<SignInOutDto> {
    const result: SignInResult = await this.commandBus.execute(
      new SignInCommand(dto.emailOrUsername, dto.password),
    );

    const userOut: UserOutDto = {
      id: result.user.uuid,
      email: result.user.email,
      username: result.user.username,
      createdAt: result.user.createdAt.toISOString(),
    };

    return {
      user: userOut,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      emailVerificationRequired: result.emailVerificationRequired,
    };
  }
}
