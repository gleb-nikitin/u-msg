# Roadmap Intent

## Global Goals
- Project: `u-msg`
- Purpose: chain-based messaging for humans, agents, and services with durable writes, predictable read state, and a thin backend over shared storage.

## Near-Term Priorities
1. Start protocol-first MVP execution from the canonical docs set rooted at `./agent/docs/index.md`.
2. Reuse ready workspace solutions:
   - `/Users/glebnikitin/work/code/u-db` for persistence and read/write integration.
   - `/Users/glebnikitin/work/code/u-msg-ui` for UI flows and interaction patterns.
3. Keep provider-specific LLM integrations out of `u-msg` roadmap scope; focus this repo on protocol and integration-support artifacts.
4. Keep project docs and specs concise, canonical, and conflict-free for no-history execution.
5. Standardize launch ergonomics so `u-msg` is easy to run from process managers and custom apps (explicit `cwd`, explicit env, fixed runtime binary paths, and one reproducible health check flow).

## Direction Rules
- Keep specs concise, implementation-oriented, and testable.
- Keep context files compact and suitable for no-history sessions.
- Move recurring troubleshooting into `how-to/*.md` via the KB index.
- Keep the protocol compatible with major agent families without hard-coding provider assumptions.
- Use this repository for protocol contracts and integration support; provider adapters are implemented in separate projects.
- Prefer explicit runtime configuration for launcher integrations (avoid hidden shell-profile dependencies for `node/npm` and `u-db-*` command resolution).

## Tech Debt
- 2026-03-08 | P1 | Bound `mark-read` `through` to the chain max seq in `src/services/mark-read.ts` so oversized cursors cannot suppress unread counts.
- 2026-03-08 | P2 | Remove/replace the hard `readRecentMail(..., 10000)` scan cap in `src/services/list-chains.ts` because `/api/chains` and `/api/inbox` become incomplete when total mail exceeds 10k rows.

## Decisions
<!-- Log direction-changing decisions. Format: date | decision | rationale -->
- 2026-03-06 | External solution scope includes `u-db` and `u-msg-ui` as reusable components | Avoid re-implementing solved DB/UI layers inside `u-msg`.
- 2026-03-08 | Canonical startup context moved to `agent/docs/index.md` and project context was split by topic | Keep one source of truth per topic and make no-history startup deterministic.
- 2026-03-08 | Provider integrations are postponed until after the protocol-first MVP | Keep MVP focused on one provider-neutral message contract and add Claude/OpenAI/Ollama adapters later.
- 2026-03-08 | Provider order is Claude first, OpenAI second, Ollama last | Match current knowledge-source availability and keep the most local/control-friendly path first.
- 2026-03-08 | OpenAI adapter default is Responses, not Agents SDK | Keep the future adapter closer to the provider-neutral protocol and use Agents SDK only if higher-level orchestration is later justified.
- 2026-03-08 | MVP backend slice (Specs 001-005) is complete | Core protocol, write/read/unread state, realtime fan-out, and temporary search/session contracts are now stable; next work should start from a post-MVP spec.
- 2026-03-08 | LLM/provider adapter implementation is out of scope for `u-msg` roadmap | `u-msg` now accepts protocol-only work and integration-support requests; provider adapters live in separate projects.
- 2026-03-08 | Spec 006 accepted with `msg`-prefix and UI-contract alignment | Storage targeting and API compatibility blockers are resolved while keeping repository scope protocol-only.
- 2026-03-08 | Launch ergonomics are now a post-MVP intent | Process-manager/app launches should be deterministic via explicit `cwd`, env vars, command paths, and health checks.
