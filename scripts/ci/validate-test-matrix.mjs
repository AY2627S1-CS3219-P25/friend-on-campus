/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5), date: 2026-10-12
 * Scope: Fail validation when a workspace test file is not selected by any classified test script.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Codex (model: GPT-5), date: 2026-10-11
 * Scope: Validate static GitHub Actions test matrices against root/workspace package scripts without a YAML dependency.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowPath = path.join(repositoryRoot, '.github/workflows/ci.yml');
const categoryJobs = new Map([
  ['unit', 'unit-tests'],
  ['integration', 'integration-tests'],
  ['messaging', 'messaging-tests'],
  ['migration', 'migration-tests'],
  ['seed', 'seed-tests'],
]);
const categoryScripts = new Map([
  ['test:unit', 'unit'],
  ['test:integration', 'integration'],
  ['test:messaging', 'messaging'],
  ['test:migration', 'migration'],
  ['test:seed', 'seed'],
]);
const rootSystemScripts = new Set([
  'test',
  ...categoryScripts.keys(),
  'test:acceptance',
  'test:e2e:api',
  'test:e2e:ui',
  'test:e2e',
  'test:d2',
]);
const requiredRootScripts = [...rootSystemScripts].filter((script) => script !== 'test:d2');
const testFilePattern = /\.test\.(?:[cm]?[jt]sx?)$/;
const ignoredTestDirectories = new Set(['node_modules', 'dist', 'build', 'coverage', 'generated']);
const errors = [];

function fail(message) {
  errors.push(message);
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function jobBlock(workflow, jobId) {
  const startPattern = new RegExp(`^ {2}${jobId}:\\s*$`, 'm');
  const match = startPattern.exec(workflow);
  if (!match) {
    fail(`Workflow job "${jobId}" is missing.`);
    return '';
  }
  const rest = workflow.slice(match.index + match[0].length);
  const next = /^ {2}[a-zA-Z0-9_-]+:\s*$/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function parseMatrix(block, category) {
  const lines = block.split(/\r?\n/);
  const entries = [];
  let current;
  for (const line of lines) {
    const start = /^ {10}- name:\s*(.+)$/.exec(line);
    if (start) {
      current = { category, name: unquote(start[1]) };
      entries.push(current);
      continue;
    }
    const property = /^ {12}(workspace|script|database|rabbitmq):\s*(.+)$/.exec(line);
    if (current && property) current[property[1]] = unquote(property[2]);
  }
  return entries;
}

async function workspacePackages(rootPackage) {
  const packages = [];
  for (const pattern of rootPackage.workspaces ?? []) {
    const [parent, wildcard, ...rest] = pattern.split('/');
    if (wildcard !== '*' || rest.length > 0) {
      fail(`Unsupported workspace pattern "${pattern}"; the validator supports the repository's parent/* convention.`);
      continue;
    }
    for (const entry of await readdir(path.join(repositoryRoot, parent), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packagePath = path.join(repositoryRoot, parent, entry.name, 'package.json');
      try {
        const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
        packages.push({ packagePath, packageJson });
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
  }
  return packages;
}

function validateTestScriptNames(label, scripts, allowed) {
  for (const [script, command] of Object.entries(scripts ?? {})) {
    if (script !== 'test' && !script.startsWith('test:')) continue;
    if (/watch/i.test(script) || /(?:^|\s)--?watch(?:\s|$)/i.test(command)) {
      fail(`${label} has persistent test command "${script}"; watch-mode commands must never be classified for CI.`);
    }
    if (!allowed.has(script)) {
      fail(`${label} has unrecognised test script "${script}". Rename it to a documented category or update scripts/ci/validate-test-matrix.mjs and CI together.`);
    }
  }
}

function commandTestPatterns(command) {
  const patterns = [];
  const tokenPattern = /"([^"]+)"|'([^']+)'|([^\s]+)/g;
  for (const match of command.matchAll(tokenPattern)) {
    const token = match[1] ?? match[2] ?? match[3];
    if (testFilePattern.test(token)) patterns.push(token.replace(/^\.\//, '').replaceAll('\\', '/'));
  }
  return patterns;
}

function globToRegExp(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length;) {
    if (pattern.startsWith('**/', index)) {
      source += '(?:.*/)?';
      index += 3;
      continue;
    }
    if (pattern.startsWith('**', index)) {
      source += '.*';
      index += 2;
      continue;
    }
    const character = pattern[index];
    if (character === '*') source += '[^/]*';
    else if (character === '?') source += '[^/]';
    else source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    index += 1;
  }
  return new RegExp(`${source}$`);
}

async function workspaceTestFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredTestDirectories.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await workspaceTestFiles(absolute, relative));
    else if (entry.isFile() && testFilePattern.test(entry.name)) files.push(relative);
  }
  return files;
}

async function validateTestFileCoverage(label, packagePath, scripts) {
  const classifiedCommands = [...categoryScripts.keys()]
    .map((script) => scripts?.[script])
    .filter(Boolean);
  const selectors = classifiedCommands.flatMap(commandTestPatterns).map(globToRegExp);
  for (const testFile of await workspaceTestFiles(path.dirname(packagePath))) {
    if (!selectors.some((selector) => selector.test(testFile))) {
      fail(`${label} has test file "${testFile}" that is not selected by any classified test script. Add it to the appropriate test:unit, test:integration, test:messaging, test:migration, or test:seed command.`);
    }
  }
}

function validateInfrastructure(entry) {
  const allowedDatabase = {
    unit: new Set(['none']),
    integration: new Set(['schema', 'deploy']),
    messaging: new Set(['schema', 'deploy']),
    migration: new Set(['schema']),
    seed: new Set(['deploy']),
  }[entry.category];
  const expectedRabbit = entry.category === 'messaging' ? 'true' : 'false';
  if (!allowedDatabase.has(entry.database)) {
    fail(`${entry.category} entry ${entry.workspace}/${entry.script} has invalid database metadata "${entry.database}"; expected ${[...allowedDatabase].join(' or ')}.`);
  }
  if (entry.rabbitmq !== expectedRabbit) {
    fail(`${entry.category} entry ${entry.workspace}/${entry.script} has rabbitmq=${entry.rabbitmq}; expected ${expectedRabbit}.`);
  }
}

const rootPackage = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const workflow = await readFile(workflowPath, 'utf8');
const packages = await workspacePackages(rootPackage);

validateTestScriptNames('root package.json', rootPackage.scripts, rootSystemScripts);
for (const script of requiredRootScripts) {
  if (!rootPackage.scripts?.[script]) fail(`Root package.json is missing public command "${script}".`);
}
for (const [script] of categoryScripts) {
  const expected = `npm run ${script} --workspaces --if-present`;
  if (rootPackage.scripts?.[script] !== expected) {
    fail(`Root command "${script}" must aggregate workspaces exactly as "${expected}".`);
  }
}
if (rootPackage.scripts?.test !== 'node scripts/ci/run-all-tests.mjs') {
  fail('Root "test" must run the full isolated orchestrator: node scripts/ci/run-all-tests.mjs.');
}
if (rootPackage.scripts?.['test:e2e'] !== 'node scripts/ci/run-all-tests.mjs --system-only') {
  fail('Root "test:e2e" must run the isolated orchestrator in --system-only mode.');
}

const expected = new Map();
const knownWorkspaces = new Map();
for (const { packagePath, packageJson } of packages) {
  const relative = path.relative(repositoryRoot, packagePath).replaceAll('\\', '/');
  if (!packageJson.name) {
    fail(`${relative} has no package name.`);
    continue;
  }
  knownWorkspaces.set(packageJson.name, packageJson);
  validateTestScriptNames(relative, packageJson.scripts, new Set(categoryScripts.keys()));
  await validateTestFileCoverage(relative, packagePath, packageJson.scripts);
  for (const [script, category] of categoryScripts) {
    if (!packageJson.scripts?.[script]) continue;
    const key = `${category}|${packageJson.name}|${script}`;
    expected.set(key, { category, workspace: packageJson.name, script });
  }
}

const actual = new Map();
for (const [category, jobId] of categoryJobs) {
  const block = jobBlock(workflow, jobId);
  if (!block.includes('fail-fast: false')) fail(`Workflow job "${jobId}" must set fail-fast: false.`);
  const hasPostgres = /^ {4}services:\s*$[\s\S]*?^ {6}postgres:\s*$/m.test(block);
  const hasRabbit = /^ {6}rabbitmq:\s*$/m.test(block);
  if (category === 'unit' && (hasPostgres || hasRabbit)) fail('Unit matrix must not provision PostgreSQL or RabbitMQ.');
  if (category !== 'unit' && !hasPostgres) fail(`${category} matrix must provision PostgreSQL.`);
  if ((category === 'messaging') !== hasRabbit) fail(`${category} matrix has incorrect RabbitMQ provisioning.`);

  for (const entry of parseMatrix(block, category)) {
    for (const field of ['name', 'workspace', 'script', 'database', 'rabbitmq']) {
      if (entry[field] === undefined) fail(`${jobId} matrix entry is missing "${field}": ${JSON.stringify(entry)}.`);
    }
    if (!knownWorkspaces.has(entry.workspace)) fail(`${jobId} contains stale workspace "${entry.workspace}".`);
    if (entry.script !== `test:${category}`) fail(`${jobId} entry ${entry.workspace} uses "${entry.script}" instead of "test:${category}".`);
    const expectedName = entry.workspace?.split('/').at(-1);
    if (entry.name !== expectedName) fail(`${jobId} entry ${entry.workspace} must use descriptive name "${expectedName}".`);
    validateInfrastructure(entry);
    const key = `${category}|${entry.workspace}|${entry.script}`;
    if (actual.has(key)) fail(`Duplicate CI matrix entry: ${key}.`);
    actual.set(key, entry);
  }
}

for (const [key, suite] of expected) {
  if (!actual.has(key)) fail(`Package script is missing from CI: ${suite.workspace} ${suite.script} (${suite.category}).`);
}
for (const [key, suite] of actual) {
  if (!expected.has(key)) fail(`CI matrix entry is stale or has no matching package script: ${suite.workspace} ${suite.script} (${suite.category}).`);
}

const systemJobs = [
  ['acceptance-tests', 'npm run test:acceptance'],
  ['e2e-api-tests', 'npm run test:e2e:api'],
  ['browser-uat', 'npm run test:e2e:ui'],
];
for (const [jobId, command] of systemJobs) {
  if (!jobBlock(workflow, jobId).includes(command)) fail(`System job "${jobId}" must run "${command}".`);
}
if (!jobBlock(workflow, 'test-config').includes('npm run ci:validate-tests')) {
  fail('Workflow job "test-config" must run npm run ci:validate-tests.');
}

const requiredGateJobs = [
  'lint', 'build', 'typecheck', 'test-config', ...categoryJobs.values(), ...systemJobs.map(([jobId]) => jobId),
];
const gate = jobBlock(workflow, 'test-gate');
for (const jobId of requiredGateJobs) {
  if (!new RegExp(`^ {6}- ${jobId}$`, 'm').test(gate)) fail(`Final test gate does not depend on required job "${jobId}".`);
}
if (/\b(?:firefox|webkit)\b/i.test(workflow)) fail('CI browser coverage must remain Chromium-only.');
if (/npm run db:generate/.test(workflow)) fail('CI must rely on npm ci postinstall for Prisma generation, not repeat npm run db:generate.');

if (errors.length > 0) {
  console.error(`Test matrix validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Test matrix validation passed: ${actual.size} workspace suites and ${systemJobs.length} system-test commands are consistent.`);
