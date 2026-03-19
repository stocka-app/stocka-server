import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { StartOnboardingCommand } from '@onboarding/application/commands/start-onboarding/start-onboarding.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type StartOnboardingResult = Result<OnboardingSessionModel, DomainException>;

@CommandHandler(StartOnboardingCommand)
export class StartOnboardingHandler implements ICommandHandler<StartOnboardingCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.ONBOARDING_SESSION_CONTRACT)
    private readonly sessionContract: IOnboardingSessionContract,
  ) {}

  async execute(command: StartOnboardingCommand): Promise<StartOnboardingResult> {
    const existing = await this.sessionContract.findByUserUUID(command.userUUID);

    if (existing) {
      if (existing.isCompleted()) {
        return err(new OnboardingAlreadyCompletedError());
      }
      return ok(existing);
    }

    const session = OnboardingSessionModel.create({ userUUID: command.userUUID });
    const saved = await this.sessionContract.save(session);
    return ok(saved);
  }
}
