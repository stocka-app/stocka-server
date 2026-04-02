import { Injectable, Inject, Logger } from '@nestjs/common';
import { Saga, SagaStepConfig } from '@shared/domain/saga';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  SocialSignInSagaContext,
  SocialSignInSagaOutput,
} from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import { ok, Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  ResolveSocialUserStep,
  GenerateSocialTokensStep,
  CreateSocialSessionStep,
  SyncSocialProfileStep,
  PublishSocialSignInEventsStep,
} from '@authentication/application/sagas/social-sign-in/steps';

/**
 * SocialSignInSaga — orchestrates the OAuth social sign-in flow.
 *
 * Transaction phase (ACID — all or nothing):
 *  1. resolve-social-user  → ResolveSocialUserStep  (3-path: find / link / create)
 *  2. generate-tokens      → GenerateSocialTokensStep
 *  3. create-session       → CreateSocialSessionStep
 *
 * After commit (non-transactional — runs against committed data):
 *  4. sync-social-profile  → SyncSocialProfileStep  (reads committed user/profile rows)
 *  5. publish-events       → PublishSocialSignInEventsStep (UserSignedInEvent)
 */
@Injectable()
export class SocialSignInSaga extends Saga<SocialSignInSagaContext> {
  protected readonly processName = 'social-sign-in';
  protected readonly logger = new Logger(SocialSignInSaga.name);

  constructor(
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK) uow: IUnitOfWork,
    private readonly resolveUser: ResolveSocialUserStep,
    private readonly generateTokens: GenerateSocialTokensStep,
    private readonly createSession: CreateSocialSessionStep,
    private readonly syncProfile: SyncSocialProfileStep,
    private readonly publishEvents: PublishSocialSignInEventsStep,
  ) {
    super(uow);
  }

  protected defineSteps(): SagaStepConfig<SocialSignInSagaContext>[] {
    return [
      { name: 'resolve-social-user', handler: this.resolveUser },
      { name: 'generate-tokens', handler: this.generateTokens },
      { name: 'create-session', handler: this.createSession },
      { name: 'sync-social-profile', handler: this.syncProfile, transactional: false },
      { name: 'publish-events', handler: this.publishEvents, transactional: false },
    ];
  }

  async execute(
    input: SocialSignInSagaContext,
  ): Promise<Result<SocialSignInSagaOutput, DomainException>> {
    const ctx = await this.run(input);

    /* istanbul ignore next */
    if (!ctx.user || !ctx.credential || !ctx.accessToken || !ctx.refreshToken) {
      throw new Error('SocialSignInSaga completed without required output fields');
    }

    return ok({
      user: ctx.user,
      credential: ctx.credential,
      accessToken: ctx.accessToken,
      refreshToken: ctx.refreshToken,
    });
  }
}
