import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/** True for PostgreSQL's unique-constraint violation. */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === '23505';

/** Which table the violated constraint belongs to, when PostgreSQL says. */
export const violatedTable = (error: unknown): string | undefined =>
  error instanceof QueryFailedError
    ? (error.driverError as { table?: string }).table
    : undefined;

export function rethrowAsConflict(error: unknown, message: string): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException(message);
  }
  throw error;
}
