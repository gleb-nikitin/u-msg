# Agent Policy v3

## Auto-generated file by `/work/` system script.
Manual edits to AGENTS.md in this folder are prohibited.

## Scope
- `<this-folder-name>` means the basename of the current workspace directory.
- Workspace scope: this folder and subfolders.
- Any external path not listed below requires explicit user request.

| Path | Purpose | Default access |
|---|---|---|
| `/Users/glebnikitin/disk/<this-folder-name>/` | Project data that must not go to git | Read/Write |
| `/Users/glebnikitin/work/server/<this-folder-name>/` | Server data for web-facing interfaces | Read/Write |
| `/Users/glebnikitin/work/rss/index.md` | Shared resources index (discovery only) | Read only |

## Shared resources
- Load only if needed via `/Users/glebnikitin/work/rss/index.md`.
- Use the index for discovery; load referenced resources only when the current task explicitly requires them.

## Code Search (MCP: code-indexer)
- Use Code Indexer first: `list_projects()` -> `search_code(...)` -> `find_references/find_callers`.
- Prefer `search_code` over Grep/Glob.
- Default search settings: `mode="cascade"` and `compact=true` when supported.
- Project name in index should match folder basename; use `list_projects()` for discovery.
- Use `find_solutions(query)` before non-trivial debugging and `add_solution(problem, solution)` after resolution.
- Endpoint: `http://127.0.0.1:8978/sse` (streamable HTTP, POST). Do not use `GET /sse`.
- If MCP is unavailable, use Code Indexer CLI fallback:
- `code-indexer status` -> discover indexed projects
- `code-indexer search <project> "<query>"` -> primary lookup
- `code-indexer references <project> <symbol>` / `code-indexer callers <project> <function>` -> dependency tracing
- `code-indexer reindex <project>` -> refresh index
- Use filesystem search only if both MCP and Code Indexer CLI are unavailable or insufficient.
## GIT operations
- use: `/Users/glebnikitin/work/rss/skills/git-publish/SKILL.md`
## Rule Priority
1. System/runtime constraints.
2. User instructions.
3. Local in-scope `AGENTS.md`.

## Safety
- Warn if user request leads to unsafe, destructive, or policy-conflicting actions.

## Cold Start
1. Read `./agent/roadmap/state.md` first (source of truth; other context files may lag behind).
2. If `active_spec != none`, open that spec before making changes.
3. If `state.md` and active spec pointer mismatch, stop and ask user.
4. Select protocol from user request (`Discuss` / `Plan` / `Execute` / `CTO`).
5. For `Plan` and `CTO` protocols: also load `./agent/roadmap/intent.md`.

## Context Files

### Write context files for LLM, not for user.
- Documentation/logs/context files: English, concise, LLM-efficient.
- Use only English and code in context files.

### Lazy-Load Policy
- Don't load context or historical docs by default.
- Load only when the active task explicitly requires it.
- Any file whose name contains `human` is not for LLM use; load only on explicit user request.

### Context Files
- `./agent/docs/kb.md` — lazy-load index for references, handoff notes, and known debt. Load when needed.
- `./agent/docs/arch.md` — ≤ 180 lines. Architecture, stack, boundaries. Load for design/runtime changes.
- `./agent/docs/run.md` — commands and validation. Load when executing, building, or validating.
- `./agent/docs/context.md` — ≤ 120 lines. Snapshot and current focus only.
- Keep context files compact and suitable for no-history sessions.
- If a context file is near its line limit, offload details to MCP memory cards (`create_card`); mention the card topic in the file so future sessions know to `get_cards(query="...")`.
- Maintain lazy-load index in `kb.md`.
- Before deleting legacy context files, verify coverage of commands, learnings, regressions, and diagnostics.
- Missing coverage blocks deletion.

### Roadmap
- `./agent/roadmap/state.md` — current active spec pointer and important notes for next no-history session. Links to next planned specs after completion of current spec for multi-spec queue.
- `./agent/roadmap/archive.md` — completed specs (newest first). Don't load until needed.
- `./agent/roadmap/intent.md` — project goals and direction. Load when planning a spec.

### Spec Lifecycle
- Specs live at `./agent/specs/NNN-kebab-name.md`.
- One active spec at a time.
- If `roadmap/state.md` and active spec conflict: stop and ask user.
- Spec execution: stop only if required input is missing or an assumption would change behavior.

### On Spec Completion
1. Ask for spec acceptance (except CTO protocol, where CTO may accept and proceed). After acceptance, proceed to step 2.
2. Copy completed entry to `./agent/roadmap/archive.md` (newest first).
3. Rewrite `./agent/roadmap/state.md` fully (active_spec, last_finished, next_spec, queue).
4. Update `./agent/docs/kb.md` session handoff block.
5. Verify completed work advances `intent.md` global goals; update intent if direction changed.
6. Append `milestone` entry to `./agent/log.md`.

### Session Handoff (in kb.md)
- Format:
  - date:
  - what changed:
  - why:
  - risks:
  - next checks:
- Updated on every spec completion or significant change.

## Personalization roles
- Default role: `Discuss`.
- If user asks to design a spec: use role `Plan`.
- If user asks to implement/fix/run: use role `Execute`.
- If user explicitly asks CTO mode: use role `CTO`.
- Explicit user role request overrides inferred role.
- add current role in every response as prefix: `[Role: <Discuss|Plan|Execute|CTO>]`.
## Logging
- Format: `YYYY-MM-DD HH:MM | category | action | result`
- Categories (log meaningful events only):
  - `milestone` — completed phase or deliverable.
  - `validation` — check result with outcome.
  - `policy` — rule applied that changed execution path.
  - `incident` — unexpected failure, error, or deviation from plan.
- Prefer under-logging over over-logging.
- Do not log micro-steps, context loads, file reads, or routine tool calls.
- Timestamps: current write-time only. No backfill or retroactive timestamps.

## Baseline Defaults
- If blocked and user unavailable: stop execution and log blocking reason.
- Never repeat the same failed action more than twice without new input.
- Verify paths, files, and dependencies before executing scripts.
- Agent may propose improvements but must not execute non-requested improvements without approval.
