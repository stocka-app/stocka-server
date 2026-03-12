import { Global, Module } from '@nestjs/common';
import { TypeOrmUnitOfWork } from '@shared/infrastructure/database/typeorm-unit-of-work';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Global()
@Module({
  providers: [
    {
      provide: INJECTION_TOKENS.UNIT_OF_WORK,
      useClass: TypeOrmUnitOfWork,
    },
  ],
  exports: [INJECTION_TOKENS.UNIT_OF_WORK],
})
export class UnitOfWorkModule {}
