import { ApiProperty } from '@nestjs/swagger';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';

export class StoragePageOutDto {
  @ApiProperty({ type: [StorageOutDto] })
  items!: StorageOutDto[];

  @ApiProperty({ description: 'Total items matching filters' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;

  static from(
    items: StorageOutDto[],
    total: number,
    page: number,
    limit: number,
  ): StoragePageOutDto {
    const dto = new StoragePageOutDto();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    return dto;
  }
}
