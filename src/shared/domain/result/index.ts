import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from 'neverthrow';
export { Result, ResultAsync, ok, err, okAsync, errAsync } from 'neverthrow';

export type ResultModelDomainException<T> = Result<T, DomainException>;
