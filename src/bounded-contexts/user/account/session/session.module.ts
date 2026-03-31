import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { CredentialSessionEntity } from '@user/account/session/infrastructure/entities/credential-session.entity';
import { SocialSessionEntity } from '@user/account/session/infrastructure/entities/social-session.entity';
import { TypeOrmSessionRepository } from '@user/account/session/infrastructure/repositories/typeorm-session.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, CredentialSessionEntity, SocialSessionEntity]),
  ],
  providers: [TypeOrmSessionRepository],
  exports: [TypeOrmSessionRepository],
})
export class SessionModule {}
