import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmUnitOfWork } from '@shared/infrastructure/database/typeorm-unit-of-work';
import { UnitOfWorkIsolationMiddleware } from '@shared/infrastructure/database/unit-of-work-isolation.middleware';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Global()
@Module({
  providers: [
    {
      provide: INJECTION_TOKENS.UNIT_OF_WORK,
      useClass: TypeOrmUnitOfWork,
    },
    UnitOfWorkIsolationMiddleware,
  ],
  exports: [INJECTION_TOKENS.UNIT_OF_WORK],
})
export class UnitOfWorkModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(UnitOfWorkIsolationMiddleware).forRoutes('*');
  }
}
