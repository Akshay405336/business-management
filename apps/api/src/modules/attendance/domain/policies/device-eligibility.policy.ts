const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|iPad/i;

export function isMobileOrTabletUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return MOBILE_UA.test(userAgent);
}

export function isIpAllowed(
  ip: string | null | undefined,
  allowlist: readonly string[] | undefined,
): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  if (!ip) return false;
  return allowlist.some((entry) => entry === ip || ip.startsWith(`${entry}.`));
}
