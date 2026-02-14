import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ResendEmailProvider } from '@shared/infrastructure/email/providers/resend.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT,
      useClass: ResendEmailProvider,
    },
  ],
  exports: [INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT],
})
export class EmailModule {}
