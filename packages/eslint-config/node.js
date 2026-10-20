import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

/**
 * Plain Node.js packages and tooling scripts.
 * @param {{ tsconfigRootDir: string, allowConsole?: boolean }} options
 */
export function nodeConfig({ tsconfigRootDir, allowConsole = false }) {
  return tseslint.config(...baseConfig({ tsconfigRootDir }), {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: allowConsole ? { 'no-console': 'off' } : {},
  });
}

export default nodeConfig;
