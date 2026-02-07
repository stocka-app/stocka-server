import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface ExceptionResponseObject {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  details?: { field: string; message: string }[];
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let error: string;
    let details: { field: string; message: string }[] | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = HttpStatus[status] || 'ERROR';
    } else {
      const responseObject = exceptionResponse as ExceptionResponseObject;

      // Handle class-validator errors (message is an array)
      if (Array.isArray(responseObject.message)) {
        message = responseObject.message[0] || 'Validation failed';
        details = responseObject.message.map((msg) => ({
          field: 'unknown',
          message: msg,
        }));
      } else {
        message = responseObject.message || 'An error occurred';
      }

      error = responseObject.error || HttpStatus[status] || 'ERROR';

      // Use provided details if available
      if (responseObject.details) {
        details = responseObject.details;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      ...(details && details.length > 0 && { details }),
    });
  }
}
