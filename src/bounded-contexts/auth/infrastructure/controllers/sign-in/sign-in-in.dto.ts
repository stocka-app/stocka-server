import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SignInInDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address or username',
  })
  @IsString()
  @MinLength(1, { message: 'Email or username is required' })
  emailOrUsername!: string;

  @ApiProperty({
    example: 'Password1',
    description: 'User password',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;
}
