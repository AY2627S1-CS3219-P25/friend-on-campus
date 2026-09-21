// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
// Scope: PostToolUse hook that reminds Claude to add the AI Assistance Disclosure header to files it edits.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
//
// Warn-only: feeds a reminder back to Claude, never fails the edit.
const fs = require('fs');

// TEAM: files that are exempt from the header. JSON/lock files cannot hold comments;
// the usage log is itself the disclosure. Adjust to match how you read the course rule.
const SKIP = [/\.json$/, /\.lock$/, /\.toml$/, /\.csv$/, /(^|[\\/])ai[\\/]usage-log\.md$/, /[\\/]generated[\\/]/, /[\\/]node_modules[\\/]/, /[\\/]migrations[\\/]/];

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const file = input.tool_input && input.tool_input.file_path;
if (!file || SKIP.some((re) => re.test(file))) process.exit(0);

let head = '';
try { head = fs.readFileSync(file, 'utf8').split('\n').slice(0, 40).join('\n'); } catch { process.exit(0); }

if (!/AI Assistance Disclosure/i.test(head)) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `${file} has no "AI Assistance Disclosure" header in its first 40 lines. CLAUDE.md section 2 requires one on every AI-edited file (after any YAML frontmatter or shebang). Leave the "Author review" line for the human.`,
    },
  }));
}
