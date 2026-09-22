<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-22
Scope: Wrote up the team's four comment labels as supplied by the author, plus posting rules. Wording only.
Author review: <to be completed by Reallyeasy1>
-->

# Code review convention

Every review comment starts with one of these labels. The label says what the author must do; the rest of the comment says why and how.

| Label | Meaning | Author must |
|---|---|---|
| `[BLOCKING]` | Must be fixed before merge | Fix, or reply with why it is not a defect |
| `[SUGGESTION]` | Worth changing, but does not block merge | Apply, or reply briefly if declining |
| `[NIT]` | Minor readability / style issue | Optional; no reply needed |
| `[QUESTION]` | Reviewer needs clarification | Answer in the thread |

Rules:

- One label per comment. A `[BLOCKING]` comment states the failing scenario ("with two concurrent accepts, both return 200") and the fix, not just the problem.
- Post findings as **one review** with inline comments, not a stream of single comments. The summary lists the `[BLOCKING]` items and says what was actually run (`npm run typecheck`, `npm run test:d2`) versus only read.
- Verdict: "Request changes" while any `[BLOCKING]` is open; "Approve" once they are resolved; "Comment" otherwise. AI-generated reviews are always "Comment" and say so in the summary; the human reviewer gives the verdict.
- The author resolves a thread only after addressing it; the reviewer re-checks `[BLOCKING]` threads before approving.
