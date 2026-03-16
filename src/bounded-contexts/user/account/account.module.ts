import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';
import { TypeOrmAccountRepository } from '@user/account/infrastructure/repositories/typeorm-account.repository';
import { TypeOrmCredentialAccountRepository } from '@user/account/infrastructure/repositories/typeorm-credential-account.repository';
import { TypeOrmSocialAccountRepository } from '@user/account/infrastructure/repositories/typeorm-social-account.repository';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountEntity, CredentialAccountEntity, SocialAccountEntity]),
  ],
  providers: [
    { provide: INJECTION_TOKENS.ACCOUNT_CONTRACT, useClass: TypeOrmAccountRepository },
    { provide: INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT, useClass: TypeOrmCredentialAccountRepository },
    { provide: INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT, useClass: TypeOrmSocialAccountRepository },
    TypeOrmAccountRepository,
    TypeOrmCredentialAccountRepository,
    TypeOrmSocialAccountRepository,
  ],
  exports: [
    INJECTION_TOKENS.ACCOUNT_CONTRACT,
    INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
    INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT,
    TypeOrmAccountRepository,
    TypeOrmCredentialAccountRepository,
    TypeOrmSocialAccountRepository,
  ],
})
export class AccountModule {}
