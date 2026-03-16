import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { TypeOrmSessionAggregateRepository } from '@user/account/session/infrastructure/repositories/typeorm-session.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  providers: [TypeOrmSessionAggregateRepository],
  exports: [TypeOrmSessionAggregateRepository],
})
export class SessionModule {}
