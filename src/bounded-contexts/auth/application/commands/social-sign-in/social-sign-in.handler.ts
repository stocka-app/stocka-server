import { CommandHandler, ICommandHandler, EventPublisher, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { SocialSignInCommand } from '@auth/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInResult } from '@auth/application/types/auth-result.types';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { SessionModel } from '@auth/domain/models/session.model';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { UserSignedInEvent } from '@auth/domain/events/user-signed-in.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IUserView } from '@shared/domain/contracts/user-view.contract';

@CommandHandler(SocialSignInCommand)
export class SocialSignInHandler implements ICommandHandler<SocialSignInCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: SocialSignInCommand): Promise<SocialSignInResult> {
    let user: IUserView | null;

    // Step 1: Find by (provider, providerId) — already linked, fast path
    user = await this.mediator.user.findUserBySocialProvider(command.provider, command.providerId);

    if (!user) {
      // Step 2: Find by email — existing account with a different auth method
      const existingUser = await this.mediator.user.findByEmail(command.email);

      if (existingUser) {
        // Step 3: Link this OAuth provider to the existing account (EC-002)
        await this.mediator.user.linkProviderToUser(
          existingUser.id!,
          command.provider,
          command.providerId,
        );
        // Reload so we have the updated accountType on the model
        user = (await this.mediator.user.findById(existingUser.id!))!;
      } else {
        // Step 4: No account at all — create a new social user
        const username = await this.generateUniqueUsername(command.displayName);
        user = (await this.mediator.user.createUserFromSocial(
          command.email,
          username,
          command.provider,
          command.providerId,
        ))!;
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Create and persist session
    const session = await this.createSession(user.id!, refreshToken);

    // Publish events
    this.eventPublisher.mergeObjectContext(session);
    session.commit();
    this.eventBus.publish(new UserSignedInEvent(user.uuid));

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  private async generateUniqueUsername(displayName: string): Promise<string> {
    // Sanitize display name to create a valid username
    const sanitized = displayName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20);

    let username = sanitized || 'user';

    // Check if username exists, add random suffix if it does
    let exists = await this.mediator.user.existsByUsername(username);
    while (exists) {
      const suffix = Math.random().toString(36).substring(2, 8);
      username = `${sanitized}_${suffix}`.substring(0, 30);
      exists = await this.mediator.user.existsByUsername(username);
    }

    return username;
  }

  private async generateTokens(
    user: IUserView,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.uuid, email: user.email };

    const accessExpiration = (this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
      '15m') as StringValue;
    const refreshExpiration = (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
      '7d') as StringValue;

    const accessOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiration,
    };

    const refreshOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiration,
    };

    const accessToken = await this.jwtService.signAsync(payload, accessOptions);
    const refreshToken = await this.jwtService.signAsync(payload, refreshOptions);

    return { accessToken, refreshToken };
  }

  private async createSession(userId: number, refreshToken: string): Promise<SessionModel> {
    const tokenHash = AuthDomainService.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionModel.create({
      userId,
      tokenHash,
      expiresAt,
    });

    await this.sessionContract.persist(session);
    return session;
  }
}
