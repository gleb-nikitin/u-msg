# Roadmap Intent

## Global Goals
- Project: `u-msg`
- Purpose: chain-based messaging for humans, agents, and services with durable writes, predictable read state, and a thin backend over shared storage.

## Near-Term Priorities
1. Start protocol-first MVP execution from the canonical docs set rooted at `./agent/docs/index.md`.
2. Reuse ready workspace solutions:
   - `/Users/glebnikitin/work/code/u-db` for persistence and read/write integration.
   - `/Users/glebnikitin/work/code/u-msg-ui` for UI flows and interaction patterns.
3. Keep project docs and specs concise, canonical, and conflict-free for no-history execution.

## Direction Rules
- Keep specs concise, implementation-oriented, and testable.
- Keep context files compact and suitable for no-history sessions.
- Move recurring troubleshooting into `how-to/*.md` via the KB index.

## Decisions
<!-- Log direction-changing decisions. Format: date | decision | rationale -->
- 2026-03-06 | External solution scope includes `u-db` and `u-msg-ui` as reusable components | Avoid re-implementing solved DB/UI layers inside `u-msg`.
- 2026-03-08 | Canonical startup context moved to `agent/docs/index.md` and project context was split by topic | Keep one source of truth per topic and make no-history startup deterministic.
