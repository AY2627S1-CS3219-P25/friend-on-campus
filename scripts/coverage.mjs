/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Runs every service's existing test:unit command under Node's built-in coverage and writes
 * coverage/lcov.info per service for editor extensions such as Coverage Gutters. No new dependency.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const servicesDir = path.resolve(import.meta.dirname, '../services');
// ponytail: Node's reporter cannot merge runs, so this is unit coverage only; the DB-backed suites need
// provisioned databases (see scripts/ci/run-all-tests.mjs). Switch to c8 if merged or HTML reports are wanted.
const flags = [
  '--experimental-test-coverage',
  '--test-coverage-include=src/**',
  '--test-coverage-exclude=src/generated/**',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
].join(' ');

let failed = false;
for (const service of readdirSync(servicesDir)) {
  const cwd = path.join(servicesDir, service);
  const script = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).scripts?.['test:unit'];
  if (!script?.startsWith('node ')) continue; // no unit suite (credit-service) or not a node --test command
  mkdirSync(path.join(cwd, 'coverage'), { recursive: true });
  const command = `node ${flags} ${script.slice('node '.length)}`;
  console.log(`\n== ${service}\n> ${command}`);
  if (spawnSync(command, { cwd, stdio: 'inherit', shell: true }).status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
