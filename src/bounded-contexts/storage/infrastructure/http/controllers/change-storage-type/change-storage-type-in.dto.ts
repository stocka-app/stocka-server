import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class ChangeStorageTypeInDto {
  @ApiProperty({ enum: StorageType, description: 'Target storage type' })
  @IsEnum(StorageType)
  type!: StorageType;
}
