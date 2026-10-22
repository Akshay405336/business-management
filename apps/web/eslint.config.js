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
      'src/features/admin/auth/components/admin-shell.tsx',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
];

export default config;
