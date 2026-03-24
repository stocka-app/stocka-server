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
      ctx.user = linked.user;
      ctx.accountId = linked.social.accountId;
      ctx.socialAccountUUID = linked.social.uuid;
      // Fetch credential for token generation
      const credResult = await this.mediator.user.findUserByEmail(ctx.email);
      if (credResult) ctx.credential = credResult.credential;
      ctx.path = 'existing-provider';

      await this.upsertSocialProfile(ctx, linked.social.uuid);
      return;
    }

    const existingByEmail = await this.mediator.user.findUserByEmail(ctx.email);
    if (existingByEmail) {
      // Path B — existing account with different auth method: link the new provider
      const existingUserId = existingByEmail.user.id;
      if (existingUserId === undefined) throw new Error('ResolveSocialUserStep: user has no id');
      const newSocial = await this.mediator.user.linkSocialAccount(existingUserId, {
        provider: ctx.provider,
        providerId: ctx.providerId,
      });
      ctx.user = existingByEmail.user;
      ctx.credential = existingByEmail.credential;
      ctx.accountId = newSocial.accountId;
      ctx.socialAccountUUID = newSocial.uuid;
      ctx.path = 'linked-provider';

      await this.upsertSocialProfile(ctx, newSocial.uuid);
      return;
    }

    // Path C — brand new user
    const username = await this.generateUniqueUsername(ctx.displayName);
    const result = await this.mediator.user.createUserFromOAuth({
      email: ctx.email,
      username,
      provider: ctx.provider,
      providerId: ctx.providerId,
      displayName: ctx.displayName,
      avatarUrl: ctx.avatarUrl,
      locale: this.normalizeLocale(ctx.locale),
    });
    ctx.user = result.user;
    ctx.credential = result.credential;
    ctx.accountId = result.social.accountId;
    ctx.socialAccountUUID = result.social.uuid;
    ctx.path = 'new-user';

    await this.upsertSocialProfile(ctx, result.social.uuid);
  }

  private async upsertSocialProfile(
    ctx: SocialSignInSagaContext,
    socialAccountUUID: string,
  ): Promise<void> {
    /* istanbul ignore next — ctx.user is always set by all three execute() paths before this call */
    if (!ctx.user) return;
    await this.mediator.user.upsertSocialProfile({
      userUUID: ctx.user.uuid,
      socialAccountUUID,
      provider: ctx.provider,
      providerDisplayName: ctx.displayName,
      providerAvatarUrl: ctx.avatarUrl,
      givenName: ctx.givenName,
      familyName: ctx.familyName,
      locale: ctx.locale,
      emailVerified: ctx.emailVerified,
      jobTitle: ctx.jobTitle,
      rawData: ctx.rawData,
    });
  }

  private normalizeLocale(raw: string | null | undefined): string {
    if (!raw) return 'es';
    const lang = raw.split('-')[0].toLowerCase();
    return ['en', 'es'].includes(lang) ? lang : 'es';
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
