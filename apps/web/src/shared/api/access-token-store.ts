/**
 * Single in-tab access token holder. Uses globalThis so Next.js route/chunk splits
 * do not create duplicate empty stores after client navigations (e.g. login → dashboard).
 */
type AccessTokenHolder = { value: string | null };

const GLOBAL_KEY = '__techwinPlatformAccessToken';

function holder(): AccessTokenHolder {
  const globalRecord = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: AccessTokenHolder;
  };
  globalRecord[GLOBAL_KEY] ??= { value: null };
  return globalRecord[GLOBAL_KEY];
}

export const accessTokenStore = {
  get: (): string | null => holder().value,
  set: (token: string): void => {
    holder().value = token;
  },
  clear: (): void => {
    holder().value = null;
  },
};
