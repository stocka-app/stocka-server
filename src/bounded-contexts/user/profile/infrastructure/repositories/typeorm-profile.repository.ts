import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IProfileContract } from '@user/profile/domain/contracts/profile.contract';
import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { CommercialProfileModel } from '@user/profile/domain/models/commercial-profile.model';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';
import { CommercialProfileEntity } from '@user/profile/infrastructure/entities/commercial-profile.entity';
import { ProfileMapper } from '@user/profile/infrastructure/mappers/profile.mapper';
import { PersonalProfileMapper } from '@user/profile/infrastructure/mappers/personal-profile.mapper';
import { CommercialProfileMapper } from '@user/profile/infrastructure/mappers/commercial-profile.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmProfileRepository implements IProfileContract {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
    @InjectRepository(PersonalProfileEntity)
    private readonly personalRepo: Repository<PersonalProfileEntity>,
    @InjectRepository(CommercialProfileEntity)
    private readonly commercialRepo: Repository<CommercialProfileEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findByUserId(userId: number): Promise<ProfileAggregate | null> {
    const entity = await this.profileRepo.findOne({ where: { userId } });
    return entity ? ProfileMapper.toDomain(entity) : null;
  }

  async findPersonalProfileByUserId(userId: number): Promise<PersonalProfileModel | null> {
    const entity = await this.personalRepo
      .createQueryBuilder('pp')
      .innerJoin('profiles', 'prof', 'prof.id = pp.profile_id')
      .where('prof.user_id = :userId', { userId })
      .getOne();
    return entity ? PersonalProfileMapper.toDomain(entity) : null;
  }

  async findPersonalProfileByUsername(username: string): Promise<PersonalProfileModel | null> {
    const entity = await this.personalRepo
      .createQueryBuilder('pp')
      .where('LOWER(pp.username) = LOWER(:username)', { username })
      .andWhere('pp.archivedAt IS NULL')
      .getOne();
    return entity ? PersonalProfileMapper.toDomain(entity) : null;
  }

  async persistProfile(profile: ProfileAggregate): Promise<ProfileAggregate> {
    const entityData = ProfileMapper.toEntity(profile);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(ProfileEntity)
      : this.profileRepo;
    const savedEntity = await repo.save(entityData);
    return ProfileMapper.toDomain(savedEntity as ProfileEntity);
  }

  async persistPersonalProfile(model: PersonalProfileModel): Promise<PersonalProfileModel> {
    const entityData = PersonalProfileMapper.toEntity(model);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(PersonalProfileEntity)
      : this.personalRepo;
    const savedEntity = await repo.save(entityData);
    return PersonalProfileMapper.toDomain(savedEntity as PersonalProfileEntity);
  }

  async persistCommercialProfile(model: CommercialProfileModel): Promise<CommercialProfileModel> {
    const entityData = CommercialProfileMapper.toEntity(model);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(CommercialProfileEntity)
      : this.commercialRepo;
    const savedEntity = await repo.save(entityData);
    return CommercialProfileMapper.toDomain(savedEntity as CommercialProfileEntity);
  }
}
