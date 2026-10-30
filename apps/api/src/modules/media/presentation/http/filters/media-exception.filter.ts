import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  MediaConflictError,
  MediaForbiddenError,
  MediaNotFoundError,
  MediaStorageError,
  MediaValidationError,
} from '../../../domain/errors/media.errors.js';

@Injectable()
@Catch(
  MediaValidationError,
  MediaNotFoundError,
  MediaForbiddenError,
  MediaConflictError,
  MediaStorageError,
)
export class MediaExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | MediaValidationError
      | MediaNotFoundError
      | MediaForbiddenError
      | MediaConflictError
      | MediaStorageError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof MediaNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof MediaForbiddenError
          ? HttpStatus.FORBIDDEN
          : exception instanceof MediaConflictError
            ? HttpStatus.CONFLICT
            : exception instanceof MediaStorageError
              ? HttpStatus.BAD_GATEWAY
              : HttpStatus.BAD_REQUEST;
    response.status(status).json({
      statusCode: status,
      error: { message: exception.message, code: exception.name },
    });
  }
}
