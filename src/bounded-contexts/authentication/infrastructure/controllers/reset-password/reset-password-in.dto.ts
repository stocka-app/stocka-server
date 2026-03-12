import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';
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
    example: 'NewPassword1',
    description: 'New password (min 8 chars, at least 1 uppercase and 1 number)',
    minLength: PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'Password must be at least 8 characters long' })
  @Matches(PASSWORD_STRENGTH_PATTERN, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  newPassword!: string;
}
