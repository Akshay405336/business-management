import { CrmNotFoundError } from '../domain/errors/crm.errors.js';

export async function requireCrmEntity<T>(
  promise: Promise<T | null>,
  entity: string,
): Promise<T> {
  const value = await promise;
  if (!value) throw new CrmNotFoundError(entity);
  return value;
}
