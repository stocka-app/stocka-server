import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_PATTERN,
} from '@common/constants/validation.constants';

export class ResetPasswordInDto {
  @ApiProperty({
    example: 'abc123def456...',
    description: 'Password reset token from email',
  })
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token!: string;

  @ApiProperty({
    example: 'NewPassword1!',
    description:
      'New password (min 10 chars, max 128 chars, at least 1 uppercase, 1 number, and 1 special character)',
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
  newPassword!: string;
}
