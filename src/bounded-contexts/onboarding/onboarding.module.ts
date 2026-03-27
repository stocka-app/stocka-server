import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OnboardingSessionEntity } from '@onboarding/infrastructure/entities/onboarding-session.entity';
import { TypeOrmOnboardingSessionRepository } from '@onboarding/infrastructure/repositories/typeorm-onboarding-session.repository';
import { StartOnboardingHandler } from '@onboarding/application/commands/start-onboarding/start-onboarding.handler';
import { SaveOnboardingStepHandler } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.handler';
import { CompleteOnboardingHandler } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.handler';
import { GetOnboardingStatusHandler } from '@onboarding/application/queries/get-onboarding-status/get-onboarding-status.handler';
import { StartOnboardingController } from '@onboarding/infrastructure/http/controllers/start-onboarding/start-onboarding.controller';
import { SaveOnboardingStepController } from '@onboarding/infrastructure/http/controllers/save-onboarding-step/save-onboarding-step.controller';
import { CompleteOnboardingController } from '@onboarding/infrastructure/http/controllers/complete-onboarding/complete-onboarding.controller';
import { GetOnboardingStatusController } from '@onboarding/infrastructure/http/controllers/get-onboarding-status/get-onboarding-status.controller';
import { OnboardingFacade } from '@onboarding/application/facades/onboarding.facade';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { TenantModule } from '@tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnboardingSessionEntity]),
    CqrsModule,
    MediatorModule,
    TenantModule,
  ],
  controllers: [
    StartOnboardingController,
    SaveOnboardingStepController,
    CompleteOnboardingController,
    GetOnboardingStatusController,
  ],
  providers: [
    {
      provide: INJECTION_TOKENS.ONBOARDING_SESSION_CONTRACT,
      useClass: TypeOrmOnboardingSessionRepository,
    },
    TypeOrmOnboardingSessionRepository,
    OnboardingFacade,
    { provide: INJECTION_TOKENS.ONBOARDING_FACADE, useExisting: OnboardingFacade },
    StartOnboardingHandler,
    SaveOnboardingStepHandler,
    CompleteOnboardingHandler,
    GetOnboardingStatusHandler,
  ],
  exports: [
    INJECTION_TOKENS.ONBOARDING_FACADE,
    OnboardingFacade,
  ],
})
export class OnboardingModule {}
