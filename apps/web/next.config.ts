import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * The browser only ever talks to this web origin. `/api/v1/*` is proxied to
 * the API so auth cookies stay first-party and `SameSite=Strict` applies.
 * Rewrites are compiled into the standalone build, so in Docker the value is
 * supplied as a build argument (see docker/web/Dockerfile).
 */
const apiInternalUrl = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '..', '..'),
  poweredByHeader: false,
  reactStrictMode: true,
  rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiInternalUrl}/api/v1/:path*` }];
  },
  redirects() {
    return [{ source: '/admin', destination: '/admin/dashboard', permanent: false }];
  },
  headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
