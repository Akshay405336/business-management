#!/usr/bin/env node
/**
 * Enforces Techwin's architectural rules by statically analysing every import in
 * the API and web sources. Exits with a non-zero status on any violation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const apiSrc = path.join(repoRoot, 'apps', 'api', 'src');
const webSrc = path.join(repoRoot, 'apps', 'web', 'src');

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'generated',
  '.turbo',
]);
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs'];
const PROHIBITED_TEST_FILE = /\.(spec|test)\.(c|m)?[jt]sx?$/;

/** @type {string[]} */
const violations = [];

/** @param {string} filePath */
const rel = (filePath) => path.relative(repoRoot, filePath).split(path.sep).join('/');

/**
 * @param {string} directory
 * @param {(filePath: string) => boolean} predicate
 * @returns {string[]}
 */
function walk(directory, predicate) {
  if (!existsSync(directory)) return [];
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath, predicate));
    else if (predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

/** @param {string} filePath */
function importsOf(filePath) {
  const info = ts.preProcessFile(readFileSync(filePath, 'utf8'), true, true);
  return info.importedFiles.map((entry) => entry.fileName);
}

/**
 * Resolves a specifier written with NodeNext (`./x.js`) or bundler (`@/x`) conventions
 * to the TypeScript source file it refers to.
 * @param {string} fromFile
 * @param {string} specifier
 * @param {{ alias?: { prefix: string, target: string } }} options
 * @returns {string | null}
 */
function resolveInternal(fromFile, specifier, options) {
  let base;
  if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier);
  else if (options.alias && specifier.startsWith(options.alias.prefix)) {
    base = path.join(options.alias.target, specifier.slice(options.alias.prefix.length));
  } else return null;

  const withoutJs = base.replace(/\.(m?js|jsx)$/, '');
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => withoutJs + ext),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return base;
}

/**
 * @param {Map<string, Set<string>>} graph
 * @param {string} label
 */
function detectCycles(graph, label) {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  /** @type {Map<string, number>} */
  const colour = new Map();
  /** @type {string[]} */
  const stack = [];
  const reported = new Set();

  /** @param {string} node */
  const visit = (node) => {
    colour.set(node, GREY);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const state = colour.get(next) ?? WHITE;
      if (state === GREY) {
        const cycle = [...stack.slice(stack.indexOf(next)), next].map(rel);
        const key = [...cycle].sort().join('|');
        if (!reported.has(key)) {
          reported.add(key);
          violations.push(`[${label}] circular import: ${cycle.join(' -> ')}`);
        }
      } else if (state === WHITE && graph.has(next)) {
        visit(next);
      }
    }
    stack.pop();
    colour.set(node, BLACK);
  };

  for (const node of graph.keys()) {
    if ((colour.get(node) ?? WHITE) === WHITE) visit(node);
  }
}

// ---------------------------------------------------------------------------
// API rules
// ---------------------------------------------------------------------------

const SECURITY_CONTRACTS = 'infrastructure/security/security.contracts.ts';
const FRAMEWORK_OR_DRIVER_PACKAGES = [
  /^@prisma\//,
  /^express$/,
  /^ioredis$/,
  /^jose$/,
  /^argon2$/,
  /^otplib$/,
  /^pino/,
  /^nestjs-pino$/,
  /^helmet$/,
  /^cookie-parser$/,
];

/**
 * @param {string} filePath absolute path inside apps/api/src
 */
function classifyApiFile(filePath) {
  const relative = path.relative(apiSrc, filePath).split(path.sep).join('/');
  const moduleMatch =
    /^modules\/([^/]+)\/(?:(domain|application|infrastructure|presentation|cli)\/)?/.exec(relative);
  if (moduleMatch) {
    const [, moduleName, layer] = moduleMatch;
    const isPublicApi = relative === `modules/${moduleName}/index.ts`;
    return { relative, area: 'module', moduleName, layer: layer ?? 'module-root', isPublicApi };
  }
  const [top] = relative.split('/');
  if (relative === SECURITY_CONTRACTS) return { relative, area: 'security-contracts' };
  if (top === 'infrastructure') return { relative, area: 'shared-infrastructure' };
  if (top === 'common') return { relative, area: 'common' };
  if (top === 'config') return { relative, area: 'config' };
  if (top === 'generated') return { relative, area: 'generated' };
  return { relative, area: 'root' };
}

function checkApi() {
  const files = walk(apiSrc, (file) => /\.(m?ts)$/.test(file));
  /** @type {Map<string, Set<string>>} */
  const graph = new Map();

  for (const file of files) {
    const from = classifyApiFile(file);
    const edges = new Set();
    graph.set(file, edges);

    for (const specifier of importsOf(file)) {
      const resolved = resolveInternal(file, specifier, {});
      const where = `${from.relative} imports "${specifier}"`;

      if (!resolved) {
        // External package.
        if (from.area === 'module' && from.layer === 'domain') {
          violations.push(`[api] domain must not depend on packages: ${where}`);
        }
        if (from.area === 'module' && from.layer === 'application') {
          const forbidden =
            FRAMEWORK_OR_DRIVER_PACKAGES.some((pattern) => pattern.test(specifier)) ||
            (specifier.startsWith('@nestjs/') && specifier !== '@nestjs/common');
          if (forbidden)
            violations.push(`[api] application must not depend on ${specifier}: ${where}`);
        }
        if (
          from.area === 'module' &&
          from.layer === 'presentation' &&
          /^@prisma\//.test(specifier)
        ) {
          violations.push(`[api] presentation must not use Prisma: ${where}`);
        }
        continue;
      }

      if (!resolved.startsWith(apiSrc)) {
        violations.push(`[api] import escapes apps/api/src: ${where}`);
        continue;
      }
      edges.add(resolved);
      const to = classifyApiFile(resolved);

      // Cross-module access only through the public index.
      if (
        from.area === 'module' &&
        to.area === 'module' &&
        from.moduleName !== to.moduleName &&
        !to.isPublicApi
      ) {
        violations.push(
          `[api] cross-module import must use modules/${to.moduleName}/index.ts: ${where}`,
        );
      }
      if (
        (from.area === 'shared-infrastructure' ||
          from.area === 'common' ||
          from.area === 'config') &&
        to.area === 'module'
      ) {
        violations.push(`[api] ${from.area} must not depend on feature modules: ${where}`);
      }
      if (from.area === 'config' && to.area !== 'config') {
        violations.push(`[api] config must be self-contained: ${where}`);
      }
      if (from.area === 'security-contracts' && to.area !== 'security-contracts') {
        violations.push(`[api] security contracts must not import implementations: ${where}`);
      }
      if (from.area !== 'module' || (to.area === 'module' && from.moduleName !== to.moduleName))
        continue;

      const sameModule = to.area === 'module' && to.moduleName === from.moduleName;
      switch (from.layer) {
        case 'domain':
          if (!(sameModule && to.layer === 'domain')) {
            violations.push(`[api] domain may only import its own domain: ${where}`);
          }
          break;
        case 'application':
          if (sameModule && !['domain', 'application'].includes(to.layer ?? '')) {
            violations.push(
              `[api] application may only depend on domain and application: ${where}`,
            );
          }
          if (!sameModule && to.area !== 'security-contracts') {
            violations.push(
              `[api] application may only use shared code via security contracts: ${where}`,
            );
          }
          break;
        case 'presentation':
          if (sameModule && !['application', 'domain', 'presentation'].includes(to.layer ?? '')) {
            violations.push(`[api] presentation must not depend on ${to.layer}: ${where}`);
          }
          if (to.area === 'shared-infrastructure' || to.area === 'generated') {
            violations.push(`[api] presentation must not depend on infrastructure: ${where}`);
          }
          break;
        case 'infrastructure':
          if (sameModule && !['domain', 'infrastructure'].includes(to.layer ?? '')) {
            violations.push(`[api] infrastructure may only depend on domain contracts: ${where}`);
          }
          break;
        default:
          break;
      }
    }
  }

  for (const file of files) {
    const { relative } = classifyApiFile(file);
    if (/^modules\/[^/]+\/application\/(commands|queries|ports|support)\//.test(relative)) {
      violations.push(`[api] use cases must sit directly under application/: ${relative}`);
    }
  }

  detectCycles(graph, 'api');
}

// ---------------------------------------------------------------------------
// Web rules
// ---------------------------------------------------------------------------

function checkWeb() {
  const files = walk(webSrc, (file) => /\.(tsx?|mts)$/.test(file));
  const alias = { prefix: '@/', target: webSrc };
  /** @type {Map<string, Set<string>>} */
  const graph = new Map();

  /** @param {string} file */
  const area = (file) =>
    path.relative(webSrc, file).split(path.sep).join('/').split('/').slice(0, 2).join('/');

  for (const file of files) {
    const fromArea = area(file);
    const relative = rel(file);
    const edges = new Set();
    graph.set(file, edges);

    const source = readFileSync(file, 'utf8');
    if (/\b(localStorage|sessionStorage)\b/.test(source)) {
      violations.push(`[web] web storage must not be used for auth state: ${relative}`);
    }

    for (const specifier of importsOf(file)) {
      const resolved = resolveInternal(file, specifier, { alias });
      if (!resolved) continue;
      if (!resolved.startsWith(webSrc)) {
        violations.push(`[web] import escapes apps/web/src: ${relative} imports "${specifier}"`);
        continue;
      }
      edges.add(resolved);
      const toArea = area(resolved);
      const where = `${relative} imports "${specifier}"`;

      if (
        fromArea.startsWith('shared/') &&
        (toArea.startsWith('features/') || toArea.startsWith('app/'))
      ) {
        violations.push(`[web] shared code must not depend on features or routes: ${where}`);
      }
      if (
        fromArea === 'components/ui' &&
        !(toArea === 'components/ui' || toArea === 'shared/lib')
      ) {
        violations.push(`[web] ui primitives may only depend on shared/lib: ${where}`);
      }
      if (fromArea.startsWith('features/') && toArea.startsWith('app/')) {
        violations.push(`[web] features must not depend on routes: ${where}`);
      }
    }
  }

  detectCycles(graph, 'web');
}

// ---------------------------------------------------------------------------
// Repository-wide rules
// ---------------------------------------------------------------------------

function checkRepository() {
  for (const file of walk(repoRoot, (candidate) =>
    PROHIBITED_TEST_FILE.test(path.basename(candidate)),
  )) {
    violations.push(`[repo] spec/test files are not allowed: ${rel(file)}`);
  }
  for (const app of ['api', 'web']) {
    for (const file of walk(path.join(repoRoot, 'apps', app), (candidate) =>
      /(^|\.)Dockerfile$|^Dockerfile\./.test(path.basename(candidate)),
    )) {
      violations.push(`[repo] Dockerfiles belong under docker/: ${rel(file)}`);
    }
  }
  for (const required of ['docker/api/Dockerfile', 'docker/web/Dockerfile', 'docker-compose.yml']) {
    if (!existsSync(path.join(repoRoot, required))) violations.push(`[repo] missing ${required}`);
  }
}

checkApi();
checkWeb();
checkRepository();

if (violations.length > 0) {
  console.error(`Architecture check failed with ${violations.length} violation(s):`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log(
  'Architecture check passed: layer boundaries, module boundaries, cycles and repository rules are clean.',
);
