import { ApiProperty } from '@nestjs/swagger';

export class RbacPermissionsOutDto {
  @ApiProperty({ example: 'OWNER' })
  role!: string;

  @ApiProperty({ example: 'STARTER' })
  tier!: string;

  @ApiProperty({ example: ['PRODUCT_CREATE', 'PRODUCT_READ'], type: [String] })
  actions!: string[];

  @ApiProperty({ example: ['REPORT_ADVANCED'], type: [String] })
  grants!: string[];
}

export class RbacRoleOutDto {
  @ApiProperty({ example: 'MANAGER' })
  key!: string;

  @ApiProperty({ example: 'Manager' })
  nameEn!: string;

  @ApiProperty({ example: 'Gerente' })
  nameEs!: string;

  @ApiProperty({ example: 3 })
  hierarchyLevel!: number;
}

export class RbacAssignableRoleOutDto {
  @ApiProperty({ example: 'BUYER' })
  key!: string;

  @ApiProperty({ example: 'Buyer' })
  nameEn!: string;

  @ApiProperty({ example: 'Comprador' })
  nameEs!: string;
}
