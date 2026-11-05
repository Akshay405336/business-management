import { nextConfig } from '@techwin/eslint-config/next';

const config = [
  { ignores: ['next-env.d.ts', '.next/**'] },
  ...nextConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    files: [
      'src/features/admin/crm/**/*.tsx',
      'src/features/admin/projects/**/*.tsx',
      'src/features/admin/daily-tasks/**/*.tsx',
      'src/features/admin/leave/**/*.tsx',
      'src/features/admin/auth/components/admin-shell.tsx',
      'src/features/employee/**/*.tsx',
      'src/features/employee/**/*.ts',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
];

export default config;
