/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-21
 * Scope: Start and await isolated Credit CDC for reservation messaging tests, then stop it before system suites.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Added the chat-service integration and messaging databases and test variables.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Provision an isolated Order database for the cross-service reservation messaging suite.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-5), date: 2026-10-11
 * Scope: Select isolated host ports, route every aggregate command through them, and invoke npm portably on Windows.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Codex (model: GPT-5), date: 2026-10-11
 * Scope: Orchestrate the complete local test suite with isolated PostgreSQL, RabbitMQ, Compose, API E2E, and Chromium UAT resources.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by ngkhengyang)
import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const systemOnly = process.argv.slice(2).includes('--system-only');
const unsupportedArguments = process.argv.slice(2).filter((argument) => argument !== '--system-only');
if (unsupportedArguments.length > 0) {
  throw new Error('Usage: node scripts/ci/run-all-tests.mjs [--system-only]');
}
const bundledNpmCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmCliPath = process.env.npm_execpath
  ?? (process.platform === 'win32' && existsSync(bundledNpmCliPath) ? bundledNpmCliPath : undefined);
const npmCommand = npmCliPath ? process.execPath : 'npm';
const npmArguments = (...args) => npmCliPath ? [npmCliPath, ...args] : args;
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';
const projectName = `foc-test-${process.pid}-${Date.now()}`.toLowerCase();
const composePrefix = [
  'compose',
  '--project-name', projectName,
  '-f', path.join(repositoryRoot, 'docker-compose.yml'),
  '-f', path.join(repositoryRoot, 'docker-compose.test.yml'),
];

function reserveAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not select an available loopback port'));
        return;
      }
      resolve({ port: address.port, server });
    });
  });
}

async function selectAvailablePorts(names) {
  const reservations = [];
  try {
    for (const name of names) reservations.push({ name, ...await reserveAvailablePort() });
    return Object.fromEntries(reservations.map(({ name, port }) => [name, port]));
  } finally {
    await Promise.all(reservations.map(({ server }) => new Promise((resolve) => server.close(resolve))));
  }
}

const selectedPorts = await selectAvailablePorts(['gateway', 'postgres', 'rabbitmq', 'user', 'supplier']);
const portEnvironment = {
  TEST_GATEWAY_PORT: String(selectedPorts.gateway),
  TEST_POSTGRES_PORT: String(selectedPorts.postgres),
  TEST_RABBITMQ_PORT: String(selectedPorts.rabbitmq),
  TEST_USER_PORT: String(selectedPorts.user),
  TEST_SUPPLIER_PORT: String(selectedPorts.supplier),
};

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const composeEnvironment = {
  ...process.env,
  ...portEnvironment,
  JWT_PRIVATE_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'),
  JWT_PUBLIC_KEY: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
  JWT_ISSUER: 'friend-on-campus-user-service',
  JWT_AUDIENCE: 'friend-on-campus-services',
};
const gatewayUrl = `http://127.0.0.1:${selectedPorts.gateway}`;
const rabbitmqUrl = (username, password) =>
  `amqp://${username}:${password}@127.0.0.1:${selectedPorts.rabbitmq}/campus`;
const testEnvironment = {
  ...process.env,
  ...portEnvironment,
  GW: gatewayUrl,
  ADMIN_URL: `${gatewayUrl}/admin/`,
  SUP_DIRECT: `http://127.0.0.1:${selectedPorts.supplier}`,
  USER_DIRECT: `http://127.0.0.1:${selectedPorts.user}`,
  WS_URL: `ws://127.0.0.1:${selectedPorts.gateway}/ws/`,
  AMQP_URL: rabbitmqUrl('order_service', 'order-service-dev'),
  RABBITMQ_URL: rabbitmqUrl('user_service', 'user-service-dev'),
};

let activeChild;
let composeWasStarted = false;
let cleanupPromise;
let interrupted = false;

function displayCommand(command, args) {
  return [command, ...args].map((value) => (/\s/.test(value) ? JSON.stringify(value) : value)).join(' ');
}

function terminate(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

function run(command, args, { env = process.env, timeoutMinutes = 15, allowFailure = false } = {}) {
  console.log(`\n> ${displayCommand(command, args)}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env,
      stdio: 'inherit',
      windowsHide: true,
    });
    activeChild = child;
    const timer = setTimeout(() => {
      console.error(`Command exceeded ${timeoutMinutes} minutes.`);
      terminate(child);
    }, timeoutMinutes * 60_000);

    child.once('error', (error) => {
      clearTimeout(timer);
      if (activeChild === child) activeChild = undefined;
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      if (activeChild === child) activeChild = undefined;
      if (code === 0 || allowFailure) {
        resolve(code ?? 1);
        return;
      }
      reject(new Error(`${displayCommand(command, args)} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
    });
  });
}

const runNpm = (script, env = process.env, timeoutMinutes = 15) =>
  run(npmCommand, npmArguments('run', script), { env, timeoutMinutes });
const runWorkspace = (script, workspace, env, timeoutMinutes = 10) =>
  run(npmCommand, npmArguments('run', script, `--workspace=${workspace}`), { env, timeoutMinutes });
const compose = (args, options = {}) =>
  run(dockerCommand, [...composePrefix, ...args], { env: composeEnvironment, timeoutMinutes: 10, ...options });

function databaseUrl(databaseName) {
  return `postgresql://postgres:postgres@127.0.0.1:${selectedPorts.postgres}/${databaseName}`;
}

async function createDatabase(databaseName) {
  await run(process.execPath, ['scripts/ci/create-test-database.mjs'], {
    env: {
      ...testEnvironment,
      POSTGRES_ADMIN_URL: databaseUrl('postgres'),
      TEST_DATABASE_NAME: databaseName,
    },
    timeoutMinutes: 2,
  });
}

async function deployDatabase(workspace, url) {
  await runWorkspace('db:deploy', workspace, { ...testEnvironment, DATABASE_URL: url });
}

async function showComposeDiagnostics() {
  if (!composeWasStarted) return;
  console.error(`\nCompose diagnostics for isolated project ${projectName}:`);
  await compose(['ps', '-a'], { allowFailure: true, timeoutMinutes: 2 });
  await compose(['logs', '--no-color'], { allowFailure: true, timeoutMinutes: 3 });
}

async function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async () => {
    if (!composeWasStarted) return;
    console.log(`\nCleaning isolated Compose project ${projectName}...`);
    await compose(['down', '-v', '--remove-orphans'], { allowFailure: true, timeoutMinutes: 5 });
  })();
  return cleanupPromise;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    interrupted = true;
    console.error(`\nReceived ${signal}; stopping the active command and cleaning only ${projectName}.`);
    terminate(activeChild);
    await cleanup();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

async function runDatabaseSuites() {
  const databases = {
    creditIntegration: 'credit_integration_test',
    notificationIntegration: 'notification_integration_test',
    userIntegration: 'user_integration_test',
    creditMessaging: 'credit_messaging_test',
    orderMessaging: 'order_messaging_test',
    notificationMessaging: 'notification_messaging_test',
    chatIntegration: 'chat_integration_test',
    chatMessaging: 'chat_messaging_test',
    creditMigration: 'credit_migration_test',
    creditSeed: 'credit_seed_test',
  };
  for (const databaseName of Object.values(databases)) await createDatabase(databaseName);

  await deployDatabase('@campus-errand/credit-service', databaseUrl(databases.creditIntegration));
  await deployDatabase('@campus-errand/notification-service', databaseUrl(databases.notificationIntegration));
  await deployDatabase('@campus-errand/chat-service', databaseUrl(databases.chatIntegration));
  await runNpm('test:integration', {
    ...testEnvironment,
    CREDIT_TEST_DATABASE_URL: databaseUrl(databases.creditIntegration),
    NOTIFICATION_TEST_DATABASE_URL: databaseUrl(databases.notificationIntegration),
    CHAT_TEST_DATABASE_URL: databaseUrl(databases.chatIntegration),
    ADMIN_GUARD_TEST_DATABASE_URL: databaseUrl(databases.userIntegration),
  }, 20);

  await deployDatabase('@campus-errand/order-service', databaseUrl(databases.orderMessaging));
  await deployDatabase('@campus-errand/credit-service', databaseUrl(databases.creditMessaging));
  await deployDatabase('@campus-errand/notification-service', databaseUrl(databases.notificationMessaging));
  await deployDatabase('@campus-errand/chat-service', databaseUrl(databases.chatMessaging));
  await compose(['up', '-d', 'debezium-credit-messaging']);
  await run(process.execPath, ['scripts/ci/wait-for-cdc.mjs'], {
    env: { ...testEnvironment, CREDIT_TEST_DATABASE_URL: databaseUrl(databases.creditMessaging) },
    timeoutMinutes: 2,
  });
  await runNpm('test:messaging', {
    ...testEnvironment,
    ORDER_TEST_DATABASE_URL: databaseUrl(databases.orderMessaging),
    SAGA_TEST_EXCHANGE: 'credit-test.saga-cdc.events',
    CREDIT_TEST_DATABASE_URL: databaseUrl(databases.creditMessaging),
    CREDIT_TEST_RABBITMQ_URL: rabbitmqUrl('credit_test', 'credit-test-dev'),
    NOTIFICATION_TEST_DATABASE_URL: databaseUrl(databases.notificationMessaging),
    NOTIFICATION_TEST_RABBITMQ_URL: rabbitmqUrl('notification_service', 'notification-service-dev'),
    CHAT_TEST_DATABASE_URL: databaseUrl(databases.chatMessaging),
    CHAT_TEST_RABBITMQ_URL: rabbitmqUrl('chat_service', 'chat-service-dev'),
  }, 25);
  await compose(['stop', 'debezium-credit-messaging']);

  await runNpm('test:migration', {
    ...testEnvironment,
    CREDIT_TEST_DATABASE_URL: databaseUrl(databases.creditMigration),
  });

  await deployDatabase('@campus-errand/credit-service', databaseUrl(databases.creditSeed));
  await runNpm('test:seed', {
    ...testEnvironment,
    CREDIT_TEST_DATABASE_URL: databaseUrl(databases.creditSeed),
  }, 20);
}

async function runSystemSuites({ includeAcceptance = true } = {}) {
  await compose(['up', '--build', '-d', '--wait', '--wait-timeout', '300'], { timeoutMinutes: 30 });
  if (includeAcceptance) await runNpm('test:acceptance', testEnvironment, 15);

  await compose(['stop', 'user-service', 'supplier-service']);
  await runNpm('test:e2e:api', testEnvironment, 15);

  await compose(['up', '-d', '--wait', '--wait-timeout', '300', 'user-service', 'supplier-service']);
  await compose(['up', '-d', '--force-recreate', '--wait', '--wait-timeout', '300', 'api-gateway']);
  await run(npmCommand, npmArguments('exec', '--no', '--', 'playwright', 'install', 'chromium'), { timeoutMinutes: 15 });
  await runNpm('test:e2e:ui', testEnvironment, 20);
}

async function main() {
  console.log(`Running ${systemOnly ? 'system tests' : 'the complete test suite'} with isolated Compose project ${projectName}.`);
  console.log(`Selected host ports: gateway=${selectedPorts.gateway}, postgres=${selectedPorts.postgres}, rabbitmq=${selectedPorts.rabbitmq}, user=${selectedPorts.user}, supplier=${selectedPorts.supplier}`);
  await run(dockerCommand, ['info'], { timeoutMinutes: 2 });
  composeWasStarted = true;
  if (!systemOnly) {
    await runNpm('test:unit', process.env, 15);
    await compose(['up', '-d', '--wait', '--wait-timeout', '180', 'postgres', 'rabbitmq'], { timeoutMinutes: 10 });
    await runDatabaseSuites();
  }
  await runSystemSuites({ includeAcceptance: !systemOnly });
  console.log(systemOnly
    ? '\nAPI E2E and Chromium UI suites passed.'
    : '\nAll unit, integration, messaging, migration, seed, acceptance, API E2E, and Chromium UI suites passed.');
}

try {
  await main();
} catch (error) {
  if (!interrupted) {
    console.error(error instanceof Error ? error.message : error);
    await showComposeDiagnostics();
    process.exitCode = 1;
  }
} finally {
  await cleanup();
}
