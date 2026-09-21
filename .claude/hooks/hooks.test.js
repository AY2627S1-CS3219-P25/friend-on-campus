// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
// Scope: Self-check for the two hook scripts. Run: node .claude/hooks/hooks.test.js
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const run = (script, stdin, env = {}) =>
  execFileSync('node', [path.join(__dirname, script)], { input: JSON.stringify(stdin), encoding: 'utf8', env: { ...process.env, ...env } });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-'));
const bare = path.join(tmp, 'a.ts');
const tagged = path.join(tmp, 'b.ts');
fs.writeFileSync(bare, 'export const x = 1;\n');
fs.writeFileSync(tagged, '// AI Assistance Disclosure:\nexport const x = 1;\n');

assert.match(run('check-disclosure.js', { tool_input: { file_path: bare } }), /has no .*AI Assistance Disclosure/);
assert.strictEqual(run('check-disclosure.js', { tool_input: { file_path: tagged } }), '');
assert.strictEqual(run('check-disclosure.js', { tool_input: { file_path: path.join(tmp, 'package.json') } }), '');

// usage-log hook: a git repo with a changed file and no log entry must warn; with a newer log it must not.
const git = (...a) => execFileSync('git', a, { cwd: tmp, stdio: 'ignore' });
git('init', '-q');
const env = { CLAUDE_PROJECT_DIR: tmp };
assert.match(run('check-usage-log.js', {}, env), /usage log reminder/);
assert.strictEqual(run('check-usage-log.js', { stop_hook_active: true }, env), '');
fs.mkdirSync(path.join(tmp, 'ai'));
fs.writeFileSync(path.join(tmp, 'ai', 'usage-log.md'), '# log\n');
const later = new Date(Date.now() + 5000);
fs.utimesSync(path.join(tmp, 'ai', 'usage-log.md'), later, later);
// untracked dir shows as "ai/", so track it to get the file path in porcelain output
git('add', 'ai/usage-log.md');
assert.strictEqual(run('check-usage-log.js', {}, env), '');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('hooks ok');
