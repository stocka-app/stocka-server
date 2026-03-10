import { Module } from '@nestjs/common';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

@Module({
  providers: [MediatorService],
  exports: [MediatorService],
})
export class MediatorModule {}
