import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';

@Injectable()
export class HashNewPasswordStep implements ISagaStepHandler<ResetPasswordSagaContext> {
  async execute(ctx: ResetPasswordSagaContext): Promise<void> {
    ctx.newPasswordHash = await AuthenticationDomainService.hashPassword(ctx.newPassword);
  }
}
