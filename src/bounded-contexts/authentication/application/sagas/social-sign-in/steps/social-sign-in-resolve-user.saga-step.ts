import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';

@Injectable()
export class ResolveSocialUserStep implements ISagaStepHandler<SocialSignInSagaContext> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(ctx: SocialSignInSagaContext): Promise<void> {
    // Path A — already linked: fast path, no write needed
    const linked = await this.mediator.user.findUserBySocialProvider(ctx.provider, ctx.providerId);
    if (linked) {
      ctx.user = linked;
      ctx.path = 'existing-provider';
      return;
    }

    const existingByEmail = await this.mediator.user.findByEmail(ctx.email);
    if (existingByEmail) {
      // Path B — existing account with different auth method: link the new provider
      await this.mediator.user.linkProviderToUser(existingByEmail.id, ctx.provider, ctx.providerId);
      const reloaded = await this.mediator.user.findById(existingByEmail.id);
      if (!reloaded) {
        throw new Error('ResolveSocialUserStep: user disappeared after linking provider');
      }
      ctx.user = reloaded;
      ctx.path = 'linked-provider';
      return;
    }

    // Path C — brand new user
    const username = await this.generateUniqueUsername(ctx.displayName);
    ctx.user = await this.mediator.user.createUserFromSocial(
      ctx.email,
      username,
      ctx.provider,
      ctx.providerId,
    );
    ctx.path = 'new-user';
  }

  private async generateUniqueUsername(displayName: string): Promise<string> {
    const sanitized = displayName
      .toLowerCase()
      .replace(/\W/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20);

    let username = sanitized || 'user';

    let exists = await this.mediator.user.existsByUsername(username);
    while (exists) {
      const suffix = Math.random().toString(36).substring(2, 8);
      username = `${sanitized}_${suffix}`.substring(0, 30);
      exists = await this.mediator.user.existsByUsername(username);
    }

    return username;
  }
}
