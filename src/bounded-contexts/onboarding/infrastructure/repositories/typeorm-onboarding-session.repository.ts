import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingSessionEntity } from '@onboarding/infrastructure/entities/onboarding-session.entity';
import { OnboardingSessionMapper } from '@onboarding/infrastructure/mappers/onboarding-session.mapper';

@Injectable()
export class TypeOrmOnboardingSessionRepository implements IOnboardingSessionContract {
  constructor(
    @InjectRepository(OnboardingSessionEntity)
    private readonly repo: Repository<OnboardingSessionEntity>,
  ) {}

  async findByUserUUID(userUUID: string): Promise<OnboardingSessionModel | null> {
    const entity = await this.repo.findOne({ where: { userUUID } });
    if (!entity) return null;
    return OnboardingSessionMapper.toDomain(entity);
  }

  async save(session: OnboardingSessionModel): Promise<OnboardingSessionModel> {
    const partial = OnboardingSessionMapper.toEntity(session);
    const saved = await this.repo.save(partial);
    return OnboardingSessionMapper.toDomain(saved as OnboardingSessionEntity);
  }
}
