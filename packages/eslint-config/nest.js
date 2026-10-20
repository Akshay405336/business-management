import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

/**
 * NestJS API configuration. Decorator-based DI requires runtime class imports,
 * so `consistent-type-imports` must not convert injected classes to type imports.
 * @param {{ tsconfigRootDir: string }} options
 */
export function nestConfig({ tsconfigRootDir }) {
  return tseslint.config(...baseConfig({ tsconfigRootDir }), {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  });
}

export default nestConfig;
