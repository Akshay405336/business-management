import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '..', '.env'),
];
const envFile = envCandidates.find((candidate) => existsSync(candidate));
if (envFile) process.loadEnvFile(envFile);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` does not connect, so a missing URL is only an error for
    // commands that need the database (migrate, seed).
    url: process.env.DATABASE_URL ?? '',
  },
});
