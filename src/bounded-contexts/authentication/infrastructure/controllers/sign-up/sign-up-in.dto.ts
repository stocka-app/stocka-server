import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_PATTERN,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from '@common/constants/validation.constants';

export class SignUpInDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Username (3-30 characters, letters, numbers, and underscores only)',
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
  })
  @IsString()
  @MinLength(USERNAME_MIN_LENGTH, { message: 'Username must be at least 3 characters long' })
  @MaxLength(USERNAME_MAX_LENGTH, { message: 'Username must not exceed 30 characters' })
  @Matches(USERNAME_PATTERN, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username!: string;

  @ApiProperty({
    example: 'Password1!',
    description:
      'Password (min 10 chars, max 128 chars, at least 1 uppercase, 1 number, and 1 special character)',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: 128,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'Password must be at least 10 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(PASSWORD_STRENGTH_PATTERN, {
    message:
      'Password must contain at least one uppercase letter, one number, and one special character',
  })
  password!: string;
}
