import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IProfileContract } from '@user/profile/domain/contracts/profile.contract';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';
import { SocialProfileEntity } from '@user/profile/infrastructure/entities/social-profile.entity';
import { ProfileMapper } from '@user/profile/infrastructure/mappers/profile.mapper';
import { PersonalProfileMapper } from '@user/profile/infrastructure/mappers/personal-profile.mapper';
import { SocialProfileMapper } from '@user/profile/infrastructure/mappers/social-profile.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmProfileRepository implements IProfileContract {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
    @InjectRepository(PersonalProfileEntity)
    private readonly personalRepo: Repository<PersonalProfileEntity>,
    @InjectRepository(SocialProfileEntity)
    private readonly socialProfileRepo: Repository<SocialProfileEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  async findByUserId(userId: number): Promise<Persisted<ProfileAggregate> | null> {
    const entity = await this.profileRepo.findOne({ where: { userId } });
    return entity ? (ProfileMapper.toDomain(entity) as Persisted<ProfileAggregate>) : null;
  }

  async findPersonalProfileByUserId(
    userId: number,
  ): Promise<Persisted<PersonalProfileModel> | null> {
    const entity = await this.personalRepo
      .createQueryBuilder('pp')
      .innerJoin('profiles', 'prof', 'prof.id = pp.profile_id')
      .where('prof.user_id = :userId', { userId })
      .getOne();
    /* istanbul ignore next */
    return entity
      ? (PersonalProfileMapper.toDomain(entity) as Persisted<PersonalProfileModel>)
      : null;
  }

  async findPersonalProfileByUsername(
    username: string,
  ): Promise<Persisted<PersonalProfileModel> | null> {
    const entity = await this.personalRepo
      .createQueryBuilder('pp')
      .where('LOWER(pp.username) = LOWER(:username)', { username })
      .andWhere('pp.archivedAt IS NULL')
      .getOne();
    return entity
      ? (PersonalProfileMapper.toDomain(entity) as Persisted<PersonalProfileModel>)
      : null;
  }

  async persistProfile(profile: ProfileAggregate): Promise<Persisted<ProfileAggregate>> {
    const entityData = ProfileMapper.toEntity(profile);
    /* istanbul ignore next */
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(ProfileEntity)
      : this.profileRepo;
    const savedEntity = await repo.save(entityData);
    return ProfileMapper.toDomain(savedEntity as ProfileEntity) as Persisted<ProfileAggregate>;
  }

  async persistPersonalProfile(
    model: PersonalProfileModel,
  ): Promise<Persisted<PersonalProfileModel>> {
    const entityData = PersonalProfileMapper.toEntity(model);
    /* istanbul ignore next */
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(PersonalProfileEntity)
      : this.personalRepo;
    const savedEntity = await repo.save(entityData);
    return PersonalProfileMapper.toDomain(
      savedEntity as PersonalProfileEntity,
    ) as Persisted<PersonalProfileModel>;
  }

  /* istanbul ignore next */
  async upsertSocialProfile(model: SocialProfileModel): Promise<Persisted<SocialProfileModel>> {
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SocialProfileEntity)
      : this.socialProfileRepo;

    const existing = await repo.findOne({
      where: { profileId: model.profileId, provider: model.provider },
    });

    if (existing) {
      existing.providerDisplayName = model.providerDisplayName;
      existing.providerAvatarUrl = model.providerAvatarUrl;
      existing.givenName = model.givenName;
      existing.familyName = model.familyName;
      existing.locale = model.locale;
      existing.emailVerified = model.emailVerified;
      existing.jobTitle = model.jobTitle;
      existing.rawData = model.rawData;
      existing.syncedAt = new Date();
      const savedEntity = await repo.save(existing);
      return SocialProfileMapper.toDomain(savedEntity) as Persisted<SocialProfileModel>;
    }

    const entityData = SocialProfileMapper.toEntity(model);
    const savedEntity = await repo.save(entityData);
    return SocialProfileMapper.toDomain(
      savedEntity as SocialProfileEntity,
    ) as Persisted<SocialProfileModel>;
  }

  /* istanbul ignore next */
  async findSocialProfileByProfileAndProvider(
    profileId: number,
    provider: string,
  ): Promise<Persisted<SocialProfileModel> | null> {
    const entity = await this.socialProfileRepo.findOne({ where: { profileId, provider } });
    return entity ? (SocialProfileMapper.toDomain(entity) as Persisted<SocialProfileModel>) : null;
  }

  /* istanbul ignore next */
  async findFirstSocialProfileByProfileId(
    profileId: number,
  ): Promise<Persisted<SocialProfileModel> | null> {
    const entity = await this.socialProfileRepo.findOne({ where: { profileId } });
    return entity ? (SocialProfileMapper.toDomain(entity) as Persisted<SocialProfileModel>) : null;
  }
}
