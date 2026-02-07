import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SignUpCommand } from '@/auth/application/commands/sign-up/sign-up.command';
import { SignInCommand } from '@/auth/application/commands/sign-in/sign-in.command';
import { SignOutCommand } from '@/auth/application/commands/sign-out/sign-out.command';
import { RefreshSessionCommand } from '@/auth/application/commands/refresh-session/refresh-session.command';
import { SocialSignInCommand } from '@/auth/application/commands/social-sign-in/social-sign-in.command';
import { ForgotPasswordCommand } from '@/auth/application/commands/forgot-password/forgot-password.command';
import { ResetPasswordCommand } from '@/auth/application/commands/reset-password/reset-password.command';

@Injectable()
export class AuthFacade {
  constructor(private readonly commandBus: CommandBus) {}

  async signUp(email: string, username: string, password: string): Promise<unknown> {
    return this.commandBus.execute(new SignUpCommand(email, username, password));
  }

  async signIn(emailOrUsername: string, password: string): Promise<unknown> {
    return this.commandBus.execute(new SignInCommand(emailOrUsername, password));
  }

  async signOut(refreshToken: string): Promise<void> {
    await this.commandBus.execute(new SignOutCommand(refreshToken));
  }

  async refreshSession(refreshToken: string): Promise<unknown> {
    return this.commandBus.execute(new RefreshSessionCommand(refreshToken));
  }

  async socialSignIn(
    email: string,
    displayName: string,
    provider: string,
    providerId: string,
  ): Promise<unknown> {
    return this.commandBus.execute(
      new SocialSignInCommand(email, displayName, provider, providerId),
    );
  }

  async forgotPassword(email: string): Promise<unknown> {
    return this.commandBus.execute(new ForgotPasswordCommand(email));
  }

  async resetPassword(token: string, newPassword: string): Promise<unknown> {
    return this.commandBus.execute(new ResetPasswordCommand(token, newPassword));
  }
}
