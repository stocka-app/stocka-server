import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';

@Injectable()
export class SyncSocialProfileStep implements ISagaStepHandler<SocialSignInSagaContext> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(ctx: SocialSignInSagaContext): Promise<void> {
    /* istanbul ignore next — defensive guard; ctx.user and ctx.socialAccountUUID are always
       set by ResolveSocialUserStep before this step runs in the saga */
    if (!ctx.user || !ctx.socialAccountUUID) return;

    await this.mediator.user.upsertSocialProfile({
      userUUID: ctx.user.uuid,
      socialAccountUUID: ctx.socialAccountUUID,
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
}
