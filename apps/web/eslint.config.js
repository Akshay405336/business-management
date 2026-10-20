import { nextConfig } from '@techwin/eslint-config/next';

const config = [
  { ignores: ['next-env.d.ts', '.next/**'] },
  ...nextConfig({ tsconfigRootDir: import.meta.dirname }),
];

export default config;
