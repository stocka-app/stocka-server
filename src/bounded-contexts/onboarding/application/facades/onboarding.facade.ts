import { Injectable, Inject } from '@nestjs/common';
import { IOnboardingFacade } from '@onboarding/domain/contracts/onboarding-facade.contract';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class OnboardingFacade implements IOnboardingFacade {
  constructor(
    @Inject(INJECTION_TOKENS.ONBOARDING_SESSION_CONTRACT)
    private readonly sessionContract: IOnboardingSessionContract,
  ) {}

  async getOnboardingStatus(userUUID: string): Promise<OnboardingStatus | null> {
    const session = await this.sessionContract.findByUserUUID(userUUID);
    return session?.status ?? null;
  }
}
