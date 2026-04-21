import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StorageMapper } from '@storage/infrastructure/mappers/storage.mapper';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmStorageRepository implements IStorageRepository {
  constructor(
    @InjectRepository(StorageEntity)
    private readonly storageRepository: Repository<StorageEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(StoreRoomEntity)
    private readonly storeRoomRepository: Repository<StoreRoomEntity>,
    @InjectRepository(CustomRoomEntity)
    private readonly customRoomRepository: Repository<CustomRoomEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findOrCreate(tenantUUID: string): Promise<StorageAggregate> {
    let storageEntity = await this.storageRepository.findOne({ where: { tenantUUID } });

    if (!storageEntity) {
      const newEntity = this.storageRepository.create({ tenantUUID });
      storageEntity = await this.storageRepository.save(newEntity);
    }

    // NOTE (scalability): This loads ALL sub-spaces for the tenant in a single shot.
    // For the current scale (small businesses, < 20 spaces per tenant) this is fine.
    // If tenants with hundreds of spaces become common, consider lazy-loading sub-spaces
    // per type on demand rather than eagerly loading all three collections.
    const [warehouseEntities, storeRoomEntities, customRoomEntities] = await Promise.all([
      this.warehouseRepository.find({ where: { tenantUUID }, withDeleted: true }),
      this.storeRoomRepository.find({ where: { tenantUUID }, withDeleted: true }),
      this.customRoomRepository.find({ where: { tenantUUID }, withDeleted: true }),
    ]);

    const warehouses = warehouseEntities.map((e) => WarehouseMapper.toDomain(e));
    const storeRooms = storeRoomEntities.map((e) => StoreRoomMapper.toDomain(e));
    const customRooms = customRoomEntities.map((e) => CustomRoomMapper.toDomain(e));

    return StorageMapper.toDomain(storageEntity, warehouses, storeRooms, customRooms);
  }

  async findIdByTenantUUID(tenantUUID: string): Promise<number | null> {
    const entity = await this.storageRepository.findOne({
      where: { tenantUUID },
      select: ['id'],
    });

    /* istanbul ignore next -- defensive: every tenant gets a storage row at
       onboarding (CompleteOnboardingHandler dispatches CreateTenantCommand
       which provisions it). Sub-item handlers also load the warehouse /
       store-room / custom-room before reaching here, and those cascade from
       this storage row, so a tenant whose sub-item exists but parent storage
       does not is unreachable through the public API. */
    return entity?.id ?? null;
  }

  async existsActiveName(tenantUUID: string, name: string): Promise<boolean> {
    const lowerName = name.toLowerCase();

    const [whCount, srCount, crCount] = await Promise.all([
      this.warehouseRepository
        .createQueryBuilder('w')
        .where('w.tenant_uuid = :tenantUUID', { tenantUUID })
        .andWhere('LOWER(w.name) = :name', { name: lowerName })
        .andWhere('w.archived_at IS NULL')
        .getCount(),
      this.storeRoomRepository
        .createQueryBuilder('sr')
        .where('sr.tenant_uuid = :tenantUUID', { tenantUUID })
        .andWhere('LOWER(sr.name) = :name', { name: lowerName })
        .andWhere('sr.archived_at IS NULL')
        .getCount(),
      this.customRoomRepository
        .createQueryBuilder('cr')
        .where('cr.tenant_uuid = :tenantUUID', { tenantUUID })
        .andWhere('LOWER(cr.name) = :name', { name: lowerName })
        .andWhere('cr.archived_at IS NULL')
        .getCount(),
    ]);

    return whCount + srCount + crCount > 0;
  }
}
