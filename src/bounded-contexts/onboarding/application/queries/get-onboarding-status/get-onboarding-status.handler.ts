import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOnboardingStatusQuery } from '@onboarding/application/queries/get-onboarding-status/get-onboarding-status.query';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

export type GetOnboardingStatusResult = OnboardingSessionModel | null;

@QueryHandler(GetOnboardingStatusQuery)
export class GetOnboardingStatusHandler implements IQueryHandler<GetOnboardingStatusQuery> {
  constructor(
    @Inject(INJECTION_TOKENS.ONBOARDING_SESSION_CONTRACT)
    private readonly sessionContract: IOnboardingSessionContract,
  ) {}

  async execute(query: GetOnboardingStatusQuery): Promise<GetOnboardingStatusResult> {
    return this.sessionContract.findByUserUUID(query.userUUID);
  }
}
