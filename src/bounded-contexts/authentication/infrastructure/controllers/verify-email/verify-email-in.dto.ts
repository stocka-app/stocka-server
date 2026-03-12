import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_PATTERN,
} from '@common/constants/validation.constants';

export class VerifyEmailInDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    example: 'ABC123',
    description: 'Verification code (6 alphanumeric characters)',
    minLength: VERIFICATION_CODE_LENGTH,
    maxLength: VERIFICATION_CODE_LENGTH,
  })
  @IsString()
  @Length(VERIFICATION_CODE_LENGTH, VERIFICATION_CODE_LENGTH, {
    message: 'Verification code must be exactly 6 characters',
  })
  @Matches(VERIFICATION_CODE_PATTERN, {
    message: 'Verification code must contain only letters and numbers',
  })
  code!: string;
}
