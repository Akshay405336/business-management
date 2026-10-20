import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads the repository-root `.env` file for local development. Variables that
 * are already set in the process environment always win, and nothing happens
 * when no file exists (containers receive configuration from the orchestrator).
 */
export function loadEnvFile(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (file) process.loadEnvFile(file);
}
