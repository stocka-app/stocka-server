import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class PrepareCredentialsStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
  ) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    ctx.passwordHash = await AuthenticationDomainService.hashPassword(ctx.password);
    ctx.verificationCode = this.codeGenerator.generateVerificationCode();
  }

  compensate(_ctx: SignUpSagaContext): Promise<void> {
    // No compensation needed for credential preparation step
    return Promise.resolve();
  }
}
