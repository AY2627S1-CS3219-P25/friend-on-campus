/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Fetch and verify the pinned JMX exporter used by Debezium.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = new URL('../../docker/observability/vendor/', import.meta.url);
const destination = new URL('jmx-agent.jar', directory);
const expected = '7d61f737fd661610ccc14aea79764faa1ea94a340cbc8f0029b3d2edea3d80c1';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
await mkdir(directory, { recursive: true });
try {
  if (digest(await readFile(destination)) === expected) { console.log('JMX exporter 1.0.1 checksum verified.'); process.exit(0); }
} catch { /* Download missing artifact. */ }
const response = await fetch('https://repo.maven.apache.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/1.0.1/jmx_prometheus_javaagent-1.0.1.jar', { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`JMX exporter download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (digest(bytes) !== expected) throw new Error('JMX exporter checksum mismatch; existing artifact was not replaced');
const temporary = new URL('jmx-agent.jar.partial', directory);
await writeFile(temporary, bytes);
await rename(temporary, destination);
console.log(`JMX exporter 1.0.1 verified: ${fileURLToPath(destination)}`);
