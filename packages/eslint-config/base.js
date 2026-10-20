import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

/**
 * Type-aware TypeScript rules shared by every workspace.
 * @param {{ tsconfigRootDir: string }} options
 */
export function baseConfig({ tsconfigRootDir }) {
  return tseslint.config(
    {
      ignores: [
        '**/dist/**',
        '**/.next/**',
        '**/node_modules/**',
        '**/generated/**',
        '**/prisma/migrations/**',
        '**/.turbo/**',
        '**/*.d.ts',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        'unused-imports': unusedImports,
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        'unused-imports/no-unused-imports': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        eqeqeq: ['error', 'always'],
        'no-console': 'error',
      },
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      ...tseslint.configs.disableTypeChecked,
    },
    prettier,
  );
}

export default baseConfig;
