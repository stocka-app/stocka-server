import { ICommand } from '@nestjs/cqrs';

export class SignInCommand implements ICommand {
  constructor(
    public readonly emailOrUsername: string,
    public readonly password: string,
  ) {}
}
