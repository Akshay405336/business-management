import { nestConfig } from '@techwin/eslint-config/nest';

export default [
  ...nestConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/modules/*/cli/**/*.ts', 'prisma/seed.ts'],
    rules: { 'no-console': 'off' },
  },
];
