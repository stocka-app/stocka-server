import { ICommand } from '@nestjs/cqrs';

export class RefreshSessionCommand implements ICommand {
  constructor(public readonly refreshToken: string) {}
}
