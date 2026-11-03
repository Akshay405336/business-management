/** Bumps when sign-out or explicit refresh should bypass any client-side permission memoization. */
let generation = 0;

export function invalidateMyPermissionsCache(): void {
  generation += 1;
}

export function myPermissionsCacheGeneration(): number {
  return generation;
}
