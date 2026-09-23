<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this set-up guide from the configuration in this folder and from problems actually hit while
setting it up on Windows (gh default repo, missing language server, missing node_modules, plugin start-up timeouts).
Author review: <to be completed by Reallyeasy1>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Corrected the shared-DTO reference example after the author-approved authentication migration.
Author review: <to be completed by ngkhengyang>
-->

# Claude Code set-up guide for this repo

About 15 minutes. Do it once per machine. Everything here is about the AI tooling; for running the application itself see the root `README.md`.

**Read first:** [`../CLAUDE.md`](../CLAUDE.md) §1–2. The course limits what AI may do (no architecture, schemas, interfaces, trade-offs, prioritisation, sprint planning or rationale) and requires a usage-log entry per prompt and a disclosure header per AI-edited file. The configuration in this folder exists to make those rules hard to break by accident. It applies to other AI tools too (`AGENTS.md` points to the same file).

## 1. Prerequisites

| Need | Check | Notes |
|---|---|---|
| Node.js 20+ and npm | `node -v` | Also runs the hook scripts |
| Git | `git --version` | Windows: Git for Windows (Claude Code runs hooks through Git Bash) |
| GitHub CLI, logged in | `gh auth status` | `gh auth login` if not |
| Docker Desktop | `docker compose version` | For Postgres / RabbitMQ / the full stack |
| Claude Code | `claude --version` | `npm install -g @anthropic-ai/claude-code`, or the installer at https://claude.com/claude-code |

## 2. Repository

```bash
git clone https://github.com/AY2627S1-CS3219-P25/nus-campus-errand
cd nus-campus-errand
npm install                      # also generates both Prisma clients; needed for typecheck and the language server
gh repo set-default AY2627S1-CS3219-P25/nus-campus-errand
```

The last line matters if your clone has an `upstream` remote pointing at the course template: without it `gh` reads issues and opens PRs against the **template** repo.

## 3. TypeScript language server (for the `typescript-lsp` plugin)

```bash
npm install -g typescript-language-server typescript
typescript-language-server --version     # must print a version
```

The plugin only tells Claude Code *which* server to start; the server is this separate install. Without it the plugin is silently useless.

## 4. Plugins

Start Claude Code **from the repo root** (`claude`), then install the five core plugins listed in [`PLUGINS.md`](./PLUGINS.md) §1:

```
/plugin install typescript-lsp@claude-plugins-official
/plugin install context7@claude-plugins-official
/plugin install github@claude-plugins-official
/plugin install playwright@claude-plugins-official
/plugin install pr-review-toolkit@claude-plugins-official
```

They are already switched on for this project in `settings.json`; installing is the per-person part. Optional and situational plugins, and the ones that must stay **off** in this repo, are in `PLUGINS.md` §2–4.

If you have many plugins installed globally, turn the unrelated ones off for this repo only, in `.claude/settings.local.json` (git-ignored, yours alone):

```json
{ "enabledPlugins": { "vercel@claude-plugins-official": false, "feature-dev@claude-plugins-official": false } }
```

Unrelated plugins cost start-up time (each background server that fails to connect waits 30 s) and can inject wrong context.

## 5. Check that it loaded

Restart Claude Code from the repo root, then:

| Command | Expect |
|---|---|
| `/agents` | `backend`, `frontend`, `infrastructure`, `reviewer` |
| `/hooks` | a `PostToolUse` hook on `Edit\|Write` and a `Stop` hook. Approve them if asked |
| `/plugin` | the five core plugins enabled |
| type `/` | skills `usage-log`, `new-adr`, `issue-start` |
| ask: "use LSP to find all references to `AuthResponse`" | hits in the shared DTO package and User Service session handling |
| `node .claude/hooks/hooks.test.js` (in a terminal) | `hooks ok` |

## 6. What is in this folder

| Path | What it does |
|---|---|
| `settings.json` | Shared. **Denies** `git commit`, `git push`, `git merge`, `gh pr create/merge` and reading `.env` files; allows typecheck, `test:d2` and read-only git/gh without prompting; wires the hooks; enables the core plugins |
| `settings.local.json` | Yours, git-ignored. Personal plugin switches and permissions |
| `hooks/check-usage-log.js` | When Claude stops: warns **you** if files changed but `ai/usage-log.md` has no newer entry. Warn-only |
| `hooks/check-disclosure.js` | After each edit: reminds **Claude** if the file lacks the "AI Assistance Disclosure" header. Its `SKIP` list names exempt file types |
| `hooks/hooks.test.js` | Self-check for both |
| `skills/usage-log` | `/usage-log` — appends the log entry in the team's format |
| `skills/new-adr` | `/new-adr <title>` — creates the next numbered record in `docs/decisions/` with metadata only; you write the content |
| `skills/issue-start` | `/issue-start <n>` — fetches the issue from the right repo and lists its acceptance criteria and the code it touches |
| `agents/` | Four subagents; when and when not to use them is in `CLAUDE.md` §8 |
| `PLUGINS.md` | The team's plugin list |

## 7. Working day to day

1. **You** decide the design (record it with `/new-adr` if it is a real decision). Claude will stop and ask rather than choose a schema, interface or pattern — that is intended, not a malfunction.
2. `/issue-start <n>` for the facts and the checklist.
3. Ask for the implementation, stating your decided design in the prompt. Most tasks need no subagent; Claude picks `backend` / `frontend` / `infrastructure` only for independent or context-heavy pieces.
4. Ask the `reviewer` agent for tests, an acceptance-evidence table, or the AI-policy check before you commit.
5. Read the diff, fill in every `Author review:` line yourself, check `ai/usage-log.md` has the entry, then **commit yourself** (`! git commit …` runs it from inside the session). Claude is denied commit and push.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `gh issue view` shows unrelated issues | `gh` defaulted to the template repo — run the `gh repo set-default` line in §2 (Claude is also told to pass `-R`) |
| LSP: "Command 'typescript-language-server' not found" | §3 not done, or Claude Code was started before installing it — restart |
| LSP reports every import as unresolved | `npm install` not run in the repo |
| Hooks do nothing | Run `/hooks` and approve them; check `node -v` works in the shell Claude Code uses |
| Hook errors mentioning `$CLAUDE_PROJECT_DIR` | Claude Code was started outside the repo root — start it from the root |
| Start-up is slow, "connection timed out after 30000ms" | Globally enabled plugins with background servers you do not use here — disable them in `settings.local.json` (§4) |
| `npm run test:d2` fails to start services | It launches user- and supplier-service itself on 8001/8002: stop the app containers and any `npm run dev:user` / `dev:supplier`, keep Postgres up and seeded |
| A column is missing in Docker | The init SQL only runs on an empty volume: `docker compose down -v` (wipes local data), then up and re-seed |
| Claude refuses to commit | Intended (`settings.json` deny rule + course policy) |

Changes to anything in this folder affect the whole team: make them in a PR, and update this guide and `PLUGINS.md` in the same change.
