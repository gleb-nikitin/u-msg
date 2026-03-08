# Roadmap Intent

## Global Goals
- Project: `u-msg`
- Purpose: chain-based messaging for humans, agents, and services with durable writes, predictable read state, and a thin backend over shared storage.

## Near-Term Priorities
1. Start protocol-first MVP execution from the canonical docs set rooted at `./agent/docs/index.md`.
2. Reuse ready workspace solutions:
   - `/Users/glebnikitin/work/code/u-db` for persistence and read/write integration.
   - `/Users/glebnikitin/work/code/u-msg-ui` for UI flows and interaction patterns.
3. Defer provider-specific LLM integrations until the core protocol and backend MVP are accepted.
4. Keep project docs and specs concise, canonical, and conflict-free for no-history execution.

## Direction Rules
- Keep specs concise, implementation-oriented, and testable.
- Keep context files compact and suitable for no-history sessions.
- Move recurring troubleshooting into `how-to/*.md` via the KB index.
- Keep the protocol compatible with major agent families, including Claude, OpenAI, and local Ollama-backed runtimes, without hard-coding provider assumptions into MVP.
- For provider-specific detail, ask the user first, then prefer the code-indexed Claude KB path, use the web/official docs path for OpenAI when needed, and keep Ollama as the last adapter phase.

## Decisions
<!-- Log direction-changing decisions. Format: date | decision | rationale -->
- 2026-03-06 | External solution scope includes `u-db` and `u-msg-ui` as reusable components | Avoid re-implementing solved DB/UI layers inside `u-msg`.
- 2026-03-08 | Canonical startup context moved to `agent/docs/index.md` and project context was split by topic | Keep one source of truth per topic and make no-history startup deterministic.
- 2026-03-08 | Provider integrations are postponed until after the protocol-first MVP | Keep MVP focused on one provider-neutral message contract and add Claude/OpenAI/Ollama adapters later.
- 2026-03-08 | Provider order is Claude first, OpenAI second, Ollama last | Match current knowledge-source availability and keep the most local/control-friendly path first.
- 2026-03-08 | OpenAI adapter default is Responses, not Agents SDK | Keep the future adapter closer to the provider-neutral protocol and use Agents SDK only if higher-level orchestration is later justified.
