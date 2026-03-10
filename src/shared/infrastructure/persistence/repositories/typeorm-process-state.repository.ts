import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProcessStateContract } from '@shared/domain/process-manager/process-state.contract';
import { ProcessState, ProcessStatus } from '@shared/domain/process-manager/process-state';
import { ProcessStateEntity } from '@shared/infrastructure/persistence/entities/process-state.entity';

@Injectable()
export class TypeOrmProcessStateRepository implements IProcessStateContract {
  constructor(
    @InjectRepository(ProcessStateEntity)
    private readonly repository: Repository<ProcessStateEntity>,
  ) {}

  async findById(id: string): Promise<ProcessState | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCorrelationId(correlationId: string): Promise<ProcessState | null> {
    const entity = await this.repository.findOne({ where: { correlationId } });
    return entity ? this.toDomain(entity) : null;
  }

  async persist(state: ProcessState): Promise<ProcessState> {
    const entity = this.toEntity(state);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  private toDomain(entity: ProcessStateEntity): ProcessState {
    return {
      id: entity.id,
      processName: entity.processName,
      correlationId: entity.correlationId,
      status: entity.status as ProcessStatus,
      currentStep: entity.currentStep,
      data: entity.data,
      errorMessage: entity.errorMessage,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(state: ProcessState): Partial<ProcessStateEntity> {
    return {
      id: state.id,
      processName: state.processName,
      correlationId: state.correlationId,
      status: state.status,
      currentStep: state.currentStep,
      data: state.data,
      errorMessage: state.errorMessage,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
    };
  }
}
