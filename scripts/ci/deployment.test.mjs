// AI Assistance Disclosure:
// Tool: Codex (model: GPT-6), date: 2026-11-09
// Scope: Verify runtime generation keeps database and broker secrets random without generating demo passwords.
// Author review: <to be completed by the author>
//
// Tool: Codex (model: GPT-6), date: 2026-11-09
// Scope: Verify manual delivery gates, migration failures, and preservation of live images during infrastructure rollout.
// Author review: <to be completed by the author>

// AI-generated (edited by ngkhengyang)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const root = fileURLToPath(new URL('../../', import.meta.url));
const application = yaml.load(readFileSync(path.join(root, '.github/workflows/deploy-ecs.yml'), 'utf8'));
const infrastructure = yaml.load(readFileSync(path.join(root, '.github/workflows/deploy-infra.yml'), 'utf8'));
const sourceScript = application.jobs.prepare.steps.find(step => step.id === 'source').with.script;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

test('runtime generation keeps infrastructure secrets random and leaves demo passwords to the seed', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foc-runtime-test-'));
  try {
    const output = path.join(directory, 'runtime.json');
    const result = spawnSync(process.execPath, [path.join(root, 'infra/terraform/ecs/generate-runtime-secrets.cjs'), output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const runtime = JSON.parse(readFileSync(output, 'utf8'));
    assert.ok(!Object.keys(runtime).some(key => key.startsWith('seed_password_')));
    const passwords = Object.entries(runtime).filter(([key]) => key.startsWith('db_') || key.startsWith('rabbit_') || key === 'broker_cookie');
    assert.equal(passwords.length, 14);
    assert.equal(new Set(passwords.map(([, value]) => value)).size, passwords.length);
    for (const [, value] of passwords) assert.match(value, /^[a-f0-9]{64}$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

async function selectSource({ sha = 'main-sha', latestSha = sha, checkAccess = false, conclusion = 'success' } = {}) {
  const outputs = {};
  await new AsyncFunction('context', 'github', 'core', sourceScript)(
    { sha, repo: { owner: 'team', repo: 'demo' }, payload: { inputs: { check_access: String(checkAccess) } } },
    {
      repos: { getBranch: async () => ({ data: { commit: { sha: latestSha } } }) },
      actions: { listWorkflowRuns: async () => ({ data: { workflow_runs: [{ conclusion }] } }) },
    },
    { setOutput: (name, value) => { outputs[name] = value; }, notice: () => {} },
  );
  return outputs;
}

test('delivery is manual, restricted to main, and serialized across application and infrastructure workflows', () => {
  assert.deepEqual(Object.keys(application.on), ['workflow_dispatch']);
  assert.deepEqual(Object.keys(infrastructure.on), ['workflow_dispatch']);
  assert.equal(application.jobs.prepare.if, "github.ref == 'refs/heads/main'");
  assert.equal(infrastructure.jobs.terraform.if, "github.ref == 'refs/heads/main'");
  assert.equal(application.concurrency.group, infrastructure.concurrency.group);
  assert.equal(application.concurrency['cancel-in-progress'], false);
  assert.equal(infrastructure.on.workflow_dispatch.inputs.apply.default, false);
  for (const job of [application.jobs.build, application.jobs.deploy]) {
    assert.equal(job.steps.find(step => step.uses?.startsWith('actions/checkout@')).with.ref,
      '${{ needs.prepare.outputs.sha }}');
  }
});

test('source selection accepts successful CI and rejects failed or unfinished CI', async () => {
  assert.deepEqual(await selectSource(), { sha: 'main-sha', release: 'true' });
  await assert.rejects(selectSource({ conclusion: 'failure' }), /CI run/);
  await assert.rejects(selectSource({ conclusion: null }), /CI run/);
});

test('source selection skips superseded commits and allows access diagnosis without successful CI', async () => {
  assert.deepEqual(await selectSource({ latestSha: 'new-main' }), { release: 'false' });
  assert.deepEqual(await selectSource({ checkAccess: true, conclusion: 'failure' }),
    { sha: 'main-sha', release: 'true' });
});

test('OIDC diagnostics expose the subject without exposing the token', async () => {
  const claims = { sub: 'repo:team@123/demo@456:ref:refs/heads/main', aud: 'sts.amazonaws.com' };
  const token = 'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature';
  for (const workflow of [application, infrastructure]) {
    const steps = workflow.jobs.prepare?.steps ?? workflow.jobs.terraform.steps;
    const script = steps.find(step => step.name === 'Show the exact GitHub identity for AWS trust').with.script;
    const messages = [];
    const summary = {
      addHeading: () => summary,
      addCodeBlock: value => { messages.push(value); return summary; },
      write: async () => {},
    };
    await new AsyncFunction('core', script)({
      getIDToken: async audience => { assert.equal(audience, 'sts.amazonaws.com'); return token; },
      info: value => messages.push(value),
      summary,
    });
    assert.ok(messages.some(message => message.includes(claims.sub)));
    assert.ok(messages.every(message => !message.includes(token)));
  }
});

const mockAws = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const operation = args.slice(0, 2).join(' ');
const option = name => args[args.indexOf(name) + 1];
const file = path.join(process.env.MOCK_DIRECTORY, 'state.json');
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { revisions: {}, services: {}, events: [] };
state.events.push({ operation, args });
let response;
switch (operation) {
  case 'sts get-caller-identity': response = '891498120071'; break;
  case 'ecs describe-services': {
    const name = option('--services');
    response = { failures: [], services: [{ status: 'ACTIVE', desiredCount: 1, runningCount: 1,
      taskDefinition: state.services[name] || 'active/' + name,
      deployments: [{ rolloutState: 'COMPLETED' }] }] };
    break;
  }
  case 'ecs describe-task-definition': {
    const family = option('--task-definition');
    const migration = family.startsWith('foc-ecs-migrate-');
    const name = migration ? 'migrate' : family.replace(/^(active\\/|foc-ecs-)/, '');
    response = { taskDefinition: { family, taskDefinitionArn: family + ':1', revision: 1, status: 'ACTIVE',
      containerDefinitions: [{ name, image: family.startsWith('active/') ? 'live@sha256:' + 'b'.repeat(64) : 'old-bootstrap',
        command: migration ? ['seed'] : ['latest-template'] }] } };
    break;
  }
  case 'ecr describe-images': response = process.env.MOCK_SCENARIO === 'missing-image' ? 'None' : 'sha256:' + 'a'.repeat(64); break;
  case 'ecs register-task-definition': {
    const definition = JSON.parse(fs.readFileSync(option('--cli-input-json').replace('file://', ''), 'utf8'));
    if (definition.containerDefinitions[0].name === 'migrate' && JSON.stringify(definition.containerDefinitions[0].command) !== '["migrate"]') {
      throw new Error('A migration task must never seed');
    }
    response = definition.family + ':2';
    state.revisions[response] = definition;
    break;
  }
  case 'ecs run-task': response = process.env.MOCK_SCENARIO === 'placement-failure'
    ? { failures: [{ reason: 'RESOURCE:MEMORY' }], tasks: [] }
    : { failures: [], tasks: [{ taskArn: 'migration-task' }] }; break;
  case 'ecs describe-tasks': response = { failures: [], tasks: [{ lastStatus: 'STOPPED',
    containers: [{ name: 'migrate', exitCode: process.env.MOCK_SCENARIO === 'migration-failure' ? 1 : 0 }] }] }; break;
  case 'ecs wait': response = ''; break;
  case 'ecs update-service': state.services[option('--service')] = option('--task-definition'); response = option('--service'); break;
  default: throw new Error('Unexpected AWS operation: ' + operation);
}
fs.writeFileSync(file, JSON.stringify(state));
console.log(typeof response === 'string' ? response : JSON.stringify(response));
`;

function runDeployment(scenario, imageTag = 'release-tag') {
  const directory = mkdtempSync(path.join(tmpdir(), 'foc-delivery-'));
  try {
    const bin = path.join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin, 'aws'), mockAws, { mode: 0o700 });
    const script = readFileSync(path.join(root, 'infra/terraform/ecs/deploy-applications.sh'), 'utf8').replace(/\r\n/g, '\n');
    const result = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, MOCK_DIRECTORY: directory,
        MOCK_SCENARIO: scenario, IMAGE_TAG: imageTag, SERVICES: '["user-service","supplier-service","gateway"]',
        GITHUB_STEP_SUMMARY: path.join(directory, 'summary') },
    });
    assert.ifError(result.error);
    const state = JSON.parse(readFileSync(path.join(directory, 'state.json'), 'utf8'));
    return { ...result, state };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('release migrates every selected backend before rolling any application and pins the release digest', () => {
  const result = runDeployment('success');
  assert.equal(result.status, 0, result.stderr);
  const operations = result.state.events.map(event => event.operation);
  assert.equal(operations.filter(operation => operation === 'ecs run-task').length, 2);
  assert.ok(operations.lastIndexOf('ecs describe-tasks') < operations.indexOf('ecs update-service'));
  assert.equal(Object.keys(result.state.services).length, 3);
  for (const definition of Object.values(result.state.revisions)) {
    assert.ok(definition.containerDefinitions[0].image.endsWith('@sha256:' + 'a'.repeat(64)));
  }
});

for (const scenario of ['migration-failure', 'placement-failure', 'missing-image']) {
  test(scenario + ' prevents application updates', () => {
    const result = runDeployment(scenario);
    assert.notEqual(result.status, 0);
    assert.equal(Object.keys(result.state.services).length, 0);
  });
}

test('infrastructure rollout uses new task configuration with the deployed images and skips migrations', () => {
  const result = runDeployment('success', '');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(Object.keys(result.state.services).length, 3);
  assert.ok(!result.state.events.some(event => ['ecs run-task', 'ecr describe-images'].includes(event.operation)));
  for (const definition of Object.values(result.state.revisions)) {
    assert.equal(definition.containerDefinitions[0].image, 'live@sha256:' + 'b'.repeat(64));
    assert.deepEqual(definition.containerDefinitions[0].command, ['latest-template']);
  }
});
