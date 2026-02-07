import { Module, forwardRef } from '@nestjs/common';
import { MediatorService } from '@/shared/infrastructure/mediator/mediator.service';
import { UserModule } from '@/user/infrastructure/user.module';

@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [MediatorService],
  exports: [MediatorService],
})
export class MediatorModule {}
