import { HttpStatus, StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { API_ERROR_CODES, type ApiErrorDetail } from '@techwin/contracts';
import { ApiException } from '../filters/api-error.response.js';

function issuePath(issue: StandardSchemaV1.Issue): string {
  return (issue.path ?? [])
    .map((segment) => (typeof segment === 'object' ? segment.key : segment))
    .map(String)
    .join('.');
}

/**
 * Global pipe that validates every route parameter declared with
 * `@Body({ schema })`, `@Param(name, { schema })`, etc. and reports failures in
 * the standard error envelope.
 */
export function createSchemaValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) => {
      const details: ApiErrorDetail[] = issues.map((issue) => ({
        path: issuePath(issue),
        message: issue.message,
      }));
      return new ApiException(
        HttpStatus.BAD_REQUEST,
        API_ERROR_CODES.VALIDATION_FAILED,
        'The request is invalid.',
        details,
      );
    },
  });
}
