import { ApiProperty } from '@nestjs/swagger';
import { StorageOutDto } from '@storage/infrastructure/http/controllers/list-storages/storage-out.dto';
import { StorageStatusSummary } from '@storage/domain/schemas';

class StorageStatusSummaryOutDto {
  @ApiProperty({ description: 'Active storage count within the current type scope' })
  active!: number;

  @ApiProperty({ description: 'Frozen storage count within the current type scope' })
  frozen!: number;

  @ApiProperty({ description: 'Archived storage count within the current type scope' })
  archived!: number;
}

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

  @ApiProperty({
    description:
      'Status counts for the current type scope — unaffected by status/search filters, reflects full tenant view within the active type tab',
    type: StorageStatusSummaryOutDto,
  })
  summary!: StorageStatusSummaryOutDto;

  static from(
    items: StorageOutDto[],
    total: number,
    page: number,
    limit: number,
    summary: StorageStatusSummary,
  ): StoragePageOutDto {
    const dto = new StoragePageOutDto();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    dto.summary = summary;
    return dto;
  }
}
