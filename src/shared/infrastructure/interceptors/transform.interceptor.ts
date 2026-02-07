import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result): ApiResponse<T> => {
        // If result already has the envelope structure, return it as is
        if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
          return result as ApiResponse<T>;
        }

        // Check if result has a message property to extract
        const message =
          result && typeof result === 'object' && 'message' in result
            ? (result as { message?: string }).message
            : undefined;

        // If result has both message and data, extract data; otherwise use result as data
        const data =
          result && typeof result === 'object' && 'message' in result && 'data' in result
            ? (result as { data: T }).data
            : (result as T);

        return {
          data,
          success: true,
          ...(message && { message }),
        };
      }),
    );
  }
}
