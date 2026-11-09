/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Validate rendered ECS configurations and bridge-port discovery using fixtures without AWS access.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
const image = 'foc-observability-bundle:validation';
const temporary = await mkdtemp(join(tmpdir(), 'foc-observability-cloud-'));
function docker(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { cwd: root, stdio: 'inherit' });
    child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Docker validation failed: ${code}`)));
  });
}
try {
  for (const mode of ['agent', 'backend', 'cdc', 'data']) await mkdir(join(temporary, mode));
  await docker(['build', '-t', image, '-f', 'docker/observability/Dockerfile', '.']);
  for (const mode of ['agent', 'backend', 'cdc']) {
    await docker(['run', '--rm', '-e', 'OBS_BACKEND_HOST=broker-1.rabbit.foc.internal', '-v', `${temporary}/${mode}:/config`, '-v', `${temporary}/data:/data`, image, mode]);
  }
  await docker(['run', '--rm', '-v', `${temporary}/agent:/config:ro`, 'otel/opentelemetry-collector-contrib:0.140.0@sha256:ffc818ee108d0b934fd14207fd87ff247c9b64f344ed349d0b66c166c18a2312', 'validate', '--config=/config/collector.yaml']);
  await docker(['run', '--rm', '--entrypoint', '/bin/promtool', '-v', `${temporary}/backend:/config:ro`, 'prom/prometheus:v3.8.0@sha256:d936808bdea528155c0154a922cd42fd75716b8bb7ba302641350f9f3eaeba09', 'check', 'config', '/config/prometheus.yaml']);
  const fixtures = {
    'ecs/list-tasks': { taskArns: ['cdc-task', 'app-task'] },
    'ecs/describe-tasks': { tasks: [
      { containerInstanceArn: 'ci-1', group: 'service:cdc-order', containers: [{ networkBindings: [{ containerPort: 9404, hostPort: 34567 }] }] },
      { containerInstanceArn: 'ci-1', group: 'service:order-service', containers: [{ networkBindings: [{ containerPort: 8003, hostPort: 34568 }] }] },
    ] },
    'ecs/describe-container-instances': { containerInstances: [{ containerInstanceArn: 'ci-1', ec2InstanceId: 'i-1' }] },
    'ec2/describe-instances': { Reservations: [{ Instances: [{ InstanceId: 'i-1', PrivateIpAddress: '10.0.0.42' }] }] },
  };
  const lines = ['#!/bin/sh', 'case "$1/$2" in'];
  for (const [key, value] of Object.entries(fixtures)) lines.push(`  ${key}) printf '%s\\n' '${JSON.stringify(value)}' ;;`);
  lines.push('  *) exit 1 ;;', 'esac', '');
  const fakeAws = join(temporary, 'aws');
  await writeFile(fakeAws, lines.join('\n')); await chmod(fakeAws, 0o755);
  await docker(['run', '--rm', '--entrypoint', '/bin/sh', '-e', 'OBS_CLUSTER=fixture', '-e', 'OBS_DISCOVERY_ONCE=true', '-v', `${fakeAws}:/usr/local/bin/aws:ro`, '-v', `${temporary}/backend:/config`, image, '/bundle/cloud/discover.sh']);
  assert.deepEqual(JSON.parse(await readFile(join(temporary, 'backend/discovery/debezium.json'), 'utf8')), [{ targets: ['10.0.0.42:34567'], labels: { connector: 'order' } }]);
  assert.deepEqual(JSON.parse(await readFile(join(temporary, 'backend/discovery/readiness.json'), 'utf8')), [{ targets: ['http://10.0.0.42:34568/ready'], labels: { service: 'order-service' } }]);
  assert.equal((await readFile(join(temporary, 'cdc/jmx-agent.jar'))).length > 100000, true);
  console.log('Cloud rendering, collector/Prometheus configuration and bridge-port discovery: passed without AWS access.');
} finally { await rm(temporary, { recursive: true, force: true }); }
