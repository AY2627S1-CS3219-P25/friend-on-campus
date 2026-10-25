/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Added the chat target (services group) when merging main into PR #148; the dev:chat npm script it replaces was removed with the other per-service scripts.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity, date: 2026-10-21
 * Scope: Zero-dependency parallel workspace dev runner with prefixed log output and cross-platform signal cleanup.
 * Author review: <to be completed by author after review>
 */
// AI-generated (edited by yanhwee)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundledNpmCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmCliPath = process.env.npm_execpath
  ?? (process.platform === 'win32' && existsSync(bundledNpmCliPath) ? bundledNpmCliPath : undefined);
const npmCommand = npmCliPath ? process.execPath : 'npm';
const npmArgs = (...args) => (npmCliPath ? [npmCliPath, ...args] : args);

const TARGETS = {
  student: { group: 'apps', workspace: '@campus-errand/student-app' },
  admin: { group: 'apps', workspace: '@campus-errand/admin-portal' },
  user: { group: 'services', workspace: '@campus-errand/user-service' },
  supplier: { group: 'services', workspace: '@campus-errand/supplier-service' },
  order: { group: 'services', workspace: '@campus-errand/order-service' },
  credit: { group: 'services', workspace: '@campus-errand/credit-service' },
  notif: { group: 'services', workspace: '@campus-errand/notification-service' },
  chat: { group: 'services', workspace: '@campus-errand/chat-service' },
};

const requested = process.argv.slice(2);
const selectedKeys = new Set();

if (requested.length === 0 || requested.includes('all')) {
  for (const key of Object.keys(TARGETS)) selectedKeys.add(key);
} else {
  for (const arg of requested) {
    if (arg === 'apps' || arg === 'services') {
      for (const [key, target] of Object.entries(TARGETS)) {
        if (target.group === arg) selectedKeys.add(key);
      }
    } else if (TARGETS[arg]) {
      selectedKeys.add(arg);
    } else {
      console.error(
        `Unknown dev target "${arg}". Valid targets: all, apps, services, ${Object.keys(TARGETS).join(', ')}`,
      );
      process.exit(1);
    }
  }
}

const children = new Map();
let shuttingDown = false;

function terminateAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    terminateAll();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

const maxPrefixLen = Math.max(...[...selectedKeys].map((k) => k.length));

for (const key of selectedKeys) {
  const { workspace } = TARGETS[key];
  const prefix = `[${key.padEnd(maxPrefixLen)}]`;
  const child = spawn(npmCommand, npmArgs('run', 'dev', `--workspace=${workspace}`), {
    cwd: repositoryRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  children.set(key, child);

  if (child.stdout) {
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      console.log(`${prefix} ${line}`);
    });
  }
  if (child.stderr) {
    readline.createInterface({ input: child.stderr }).on('line', (line) => {
      console.error(`${prefix} ${line}`);
    });
  }

  child.once('exit', (code) => {
    children.delete(key);
    if (!shuttingDown && code && code !== 0) {
      console.error(`${prefix} exited with code ${code}; stopping remaining processes.`);
      terminateAll();
      process.exitCode = code;
    }
  });
}
