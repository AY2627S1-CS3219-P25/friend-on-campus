/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Adapt versioned local telemetry configuration for the approved ECS host layout.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { mkdir, readFile, writeFile, copyFile, chmod } from 'node:fs/promises';
const source = '/bundle';
const output = process.env.OBS_CONFIG_DIRECTORY ?? '/config';
const host = process.env.OBS_BACKEND_HOST;
const mode = process.argv[2];
if (!['agent', 'backend', 'cdc'].includes(mode)) throw new Error('Expected agent, backend or cdc');
if (!/^[a-z0-9.-]+$/.test(host ?? '')) throw new Error('OBS_BACKEND_HOST must be a private DNS name');
await mkdir(output, { recursive: true });
const read = (name) => readFile(`${source}/${name}`, 'utf8');
const put = (name, content) => writeFile(`${output}/${name}`, content);
if (mode === 'cdc') {
  await copyFile(`${source}/vendor/jmx-agent.jar`, `${output}/jmx-agent.jar`);
  await copyFile(`${source}/debezium-jmx.yaml`, `${output}/debezium-jmx.yaml`);
} else if (mode === 'agent') {
  let collector = await read('collector.yaml');
  collector = collector.replace(/ {2}nginx:\n[\s\S]*?(?= {2}docker_stats:)/, '').replace('[otlp, nginx, docker_stats]', '[otlp, docker_stats]');
  collector = collector.replace('tcp://docker-api:2375', 'tcp://127.0.0.1:2375').replace('http://tempo:4318', `http://${host}:14319`).replace('http://loki:3100', `http://${host}:3100`);
  collector = collector.replace('com.docker.compose.service', 'com.amazonaws.ecs.container-name').replaceAll('com.docker.compose.service', 'com.amazonaws.ecs.container-name');
  await put('collector.yaml', collector);
} else {
  await mkdir(`${output}/discovery`, { recursive: true });
  await put('discovery/debezium.json', '[]');
  await put('discovery/readiness.json', '[]');
  const hosts = [1, 2, 3].map((slot) => host.replace('broker-1.', `broker-${slot}.`));
  const scrape = (job_name, port, path = '/metrics') => ({ job_name, metrics_path: path, static_configs: [{ targets: hosts.map((hostname) => `${hostname}:${port}`) }] });
  const prometheus = { global: { scrape_interval: '15s', evaluation_interval: '15s' }, rule_files: ['/config/alerts.yaml'], scrape_configs: [
    { job_name: 'prometheus', static_configs: [{ targets: ['127.0.0.1:9090'] }] },
    scrape('collector', 8888), scrape('application', 8889), scrape('host', 9100), scrape('rabbitmq', 15692, '/metrics/per-object'),
    { job_name: 'debezium', file_sd_configs: [{ files: ['/config/discovery/debezium.json'], refresh_interval: '30s' }] },
    { job_name: 'postgres', static_configs: [{ targets: ['127.0.0.1:9187'] }] },
    { job_name: 'readiness', metrics_path: '/probe', params: { module: ['http_success'] }, file_sd_configs: [{ files: ['/config/discovery/readiness.json'], refresh_interval: '30s' }], relabel_configs: [
      { source_labels: ['__address__'], target_label: '__param_target' },
      { source_labels: ['__param_target'], target_label: 'instance' },
      { target_label: '__address__', replacement: '127.0.0.1:9115' },
    ] },
  ] };
  await put('prometheus.yaml', JSON.stringify(prometheus, null, 2));
  for (const name of ['loki.yaml', 'blackbox.yaml', 'alerts.yaml', 'postgres-queries.yaml']) await put(name, await read(name));
  await put('tempo.yaml', (await read('tempo.yaml')).replace('0.0.0.0:4317', '0.0.0.0:14317').replace('0.0.0.0:4318', '0.0.0.0:14319'));
  const datasources = (await read('grafana/datasources.yaml')).replace('http://prometheus:9090', 'http://127.0.0.1:9090').replace('http://loki:3100', 'http://127.0.0.1:3100').replace('http://tempo:3200', 'http://127.0.0.1:3200');
  await mkdir(`${output}/grafana/datasources`, { recursive: true });
  await mkdir(`${output}/grafana/dashboards`, { recursive: true });
  await put('grafana/datasources/default.yaml', datasources);
  await put('grafana/dashboards/default.yaml', (await read('grafana/dashboards.yaml')).replace('/var/lib/grafana/dashboards', '/config/grafana/json'));
  await mkdir(`${output}/grafana/json`, { recursive: true });
  await put('grafana/json/overview.json', await read('grafana/overview.json'));
  for (const [name, uid] of [['prometheus', 65534], ['loki', 10001], ['tempo', 10001], ['grafana', 472]]) {
    const dir = `/data/${name}`;
    await mkdir(dir, { recursive: true });
    // Numeric owner is set by the init container running as root, only on its mounted telemetry disk.
    const { chown } = await import('node:fs/promises'); await chown(dir, uid, uid); await chmod(dir, 0o750);
  }
}
