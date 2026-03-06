import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { mapDomainErrorToHttp } from '@shared/infrastructure/http/domain-error-mapper';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = mapDomainErrorToHttp(exception);

    response.status(httpException.getStatus()).json(httpException.getResponse());
  }
}
