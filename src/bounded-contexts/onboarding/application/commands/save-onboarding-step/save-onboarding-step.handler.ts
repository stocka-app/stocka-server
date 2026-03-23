import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SaveOnboardingStepCommand } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type SaveOnboardingStepResult = Result<OnboardingSessionModel, DomainException>;

@CommandHandler(SaveOnboardingStepCommand)
export class SaveOnboardingStepHandler implements ICommandHandler<SaveOnboardingStepCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.ONBOARDING_SESSION_CONTRACT)
    private readonly sessionContract: IOnboardingSessionContract,
  ) {}

  async execute(command: SaveOnboardingStepCommand): Promise<SaveOnboardingStepResult> {
    const session = await this.sessionContract.findByUserUUID(command.userUUID);
    if (!session) {
      return err(new OnboardingNotFoundError());
    }
    if (session.isCompleted()) {
      return err(new OnboardingAlreadyCompletedError());
    }

    session.saveProgress(command.section, command.data, command.currentStep);
    const saved = await this.sessionContract.save(session);
    return ok(saved);
  }
}
