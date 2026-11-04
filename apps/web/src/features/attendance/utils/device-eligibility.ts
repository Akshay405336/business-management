const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|iPad/i;

/** Mirrors backend device-eligibility policy for UI messaging only. */
export function isMobileOrTabletUserAgent(userAgent: string | null | undefined): boolean {
  if (typeof userAgent !== 'string' || userAgent.length === 0) return false;
  return MOBILE_UA.test(userAgent);
}

export function isDesktopBrowserSession(): boolean {
  if (typeof navigator === 'undefined') return true;
  return !isMobileOrTabletUserAgent(navigator.userAgent);
}
