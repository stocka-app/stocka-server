import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

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
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 characters' })
  @Matches(/^[A-Z0-9]+$/i, {
    message: 'Verification code must contain only letters and numbers',
  })
  code!: string;
}
