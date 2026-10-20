import nextVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

/**
 * Next.js web configuration: shared TypeScript rules plus the official Next.js,
 * React, React Hooks and accessibility rules.
 * @param {{ tsconfigRootDir: string }} options
 */
export function nextConfig({ tsconfigRootDir }) {
  return tseslint.config(...nextVitals, ...baseConfig({ tsconfigRootDir }), {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Authentication state must never be persisted in web storage.',
        },
        {
          name: 'sessionStorage',
          message: 'Authentication state must never be persisted in web storage.',
        },
      ],
    },
  });
}

export default nextConfig;
