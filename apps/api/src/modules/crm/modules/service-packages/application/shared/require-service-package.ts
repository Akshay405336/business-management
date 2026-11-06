import { ServicePackageNotFoundError } from '../../domain/errors/service-package.errors.js';

export async function requireServicePackage<T>(
  promise: Promise<T | null>,
  entity = 'Service package',
): Promise<T> {
  const value = await promise;
  if (!value) throw new ServicePackageNotFoundError(entity);
  return value;
}
