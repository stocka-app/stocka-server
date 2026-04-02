import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IStorageActivityLogRepository } from '@storage/domain/contracts/storage-activity-log.repository.contract';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';
import { StorageActivityLogMapper } from '@storage/infrastructure/mappers/storage-activity-log.mapper';

@Injectable()
export class TypeOrmStorageActivityLogRepository implements IStorageActivityLogRepository {
  constructor(
    @InjectRepository(StorageActivityLogEntity)
    private readonly repository: Repository<StorageActivityLogEntity>,
  ) {}

  async save(entry: StorageActivityLogEntry): Promise<void> {
    const entity = StorageActivityLogMapper.toEntity(entry);
    await this.repository.save(entity);
  }

  async findByStorageUUID(
    tenantUUID: string,
    storageUUID: string,
  ): Promise<StorageActivityLogEntry[]> {
    const entities = await this.repository.find({
      where: { tenantUUID, storageUUID },
      order: { occurredAt: 'DESC' },
    });
    return entities.map((e) => StorageActivityLogMapper.toDomain(e));
  }
}
