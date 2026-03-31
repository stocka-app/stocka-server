import { Controller, Get } from '@nestjs/common';
import { Secure } from '@common/decorators/secure.decorator';

@Controller()
export class AppController {
  @Get('/')
  @Secure()
  getRoot(): string {
    return 'Hello World!';
  }
}
