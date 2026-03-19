import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';

export class InviteMemberInDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    enum: MemberRoleEnum,
    description: 'Role to assign to the invited member',
    example: MemberRoleEnum.VIEWER,
  })
  @IsEnum(MemberRoleEnum)
  role!: string;
}
