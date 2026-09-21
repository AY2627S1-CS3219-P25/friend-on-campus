// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
// Scope: Stop hook that warns when files changed but ai/usage-log.md was not updated afterwards.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
//
// Warn-only by team choice: prints a message to the user, never blocks Claude from stopping.
// To make it blocking instead, replace the systemMessage output with:
//   { decision: 'block', reason: '<same text>' }
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG = 'ai/usage-log.md';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
let status = '';
try { status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }); } catch { process.exit(0); }

const changed = status.split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
const others = changed.filter((f) => f !== LOG);
if (others.length === 0) process.exit(0);

const mtime = (f) => { try { return fs.statSync(path.join(root, f)).mtimeMs; } catch { return 0; } };
// ponytail: mtime comparison, so an untracked *directory* counts by the directory's own mtime.
// Good enough for a reminder; switch to a per-session marker file if it misfires.
const newest = Math.max(...others.map(mtime));
const logIsStale = !changed.includes(LOG) || mtime(LOG) < newest;

if (logIsStale) {
  console.log(JSON.stringify({
    systemMessage: `AI usage log reminder: ${others.length} file(s) changed but ${LOG} has no newer entry. CLAUDE.md section 2 requires one per prompt (run /usage-log).`,
  }));
}
