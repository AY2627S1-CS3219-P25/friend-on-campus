// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
// Scope: Benchmark comparison for the k6 performance harness: reads two evidence bundles (test-results/<runId>/) and prints, per workload and operation, the baseline...
// Author review: I validated correctness, edited for style, and verified with automated tests.
//
//   node scripts/perf/compare-runs.mjs <baseline run> <current run> [--out file.md]
//   A run is a run id under test-results/ or a path to a run directory.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { compareRuns, renderComparison } from './lib/report.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
if (positionals.length !== 2) {
  console.error('usage: node scripts/perf/compare-runs.mjs <baseline run> <current run> [--out file.md]');
  process.exit(2);
}

function loadRun(reference) {
  const directory = existsSync(path.join(reference, 'manifest.json')) ? path.resolve(reference) : path.join(repositoryRoot, 'test-results', reference);
  const manifestPath = path.join(directory, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`compare-runs: no manifest.json in ${directory}`);
    process.exit(2);
  }
  const workloads = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const performancePath = path.join(directory, entry.name, 'performance.json');
    if (entry.isDirectory() && existsSync(performancePath)) workloads[entry.name] = JSON.parse(readFileSync(performancePath, 'utf8'));
  }
  return { manifest: JSON.parse(readFileSync(manifestPath, 'utf8')), workloads };
}

const baseline = loadRun(positionals[0]);
const current = loadRun(positionals[1]);
const markdown = renderComparison(compareRuns(baseline, current), { baseline: baseline.manifest, current: current.manifest });
if (values.out) writeFileSync(values.out, markdown);
console.log(markdown);
