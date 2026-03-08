# Knowledge Base

## Lazy-Load Index
- `./agent/docs/index.md` — canonical entrypoint and loading order.
- `./agent/docs/product.md` — product purpose, architecture, scope, and design rules.
- `./agent/docs/protocol.md` — normative chain/message/read-state contract.
- `./agent/docs/integration.md` — shipped `u-db` facts, UI/backend contract, and local infrastructure.
- `./agent/docs/roadmap.md` — implementation sequence and MVP acceptance criteria.
- `./agent/docs/run.md` — execution and validation commands.
- `./agent/docs/context.md` — cold-start snapshot.
- `./agent/how-to/how-to-open-ai.md` — lazy-load note for the future OpenAI adapter direction, tradeoffs, and cited source paths.

## Known Debt
- Specs `001` through `004` are complete; spec `005` remains to be implemented.
- Search/session remain intentionally shallow until Spec `005` defines the temporary contract behavior and ops checks.
- Provider adapter work for Claude, OpenAI, and Ollama is intentionally deferred and still needs a later spec, with Ollama explicitly last.
- OpenAI adapter decomposition is still pending, but the current default is `Responses API`; `Agents SDK` is only a fallback if later requirements need OpenAI-native orchestration.

## Session Handoff
- date: 2026-03-08
- what changed: accepted Spec `004`, archived it, and advanced roadmap state to Spec `005` after confirming deduped realtime fan-out and normalized WebSocket participant handling with regression coverage.
- why: the remaining Spec `004` blockers were fixed in behavior and tests, and realtime now matches the MVP in-process fan-out contract.
- risks: realtime still has no durable replay/delivery guarantees by design; the always-on `u-msg-ui` launcher still occupies host ports `8000`, `8001`, and `5173`, so backend/UI integration must deliberately coordinate port ownership.
- next checks: summon one executor for Spec `005`, keep session/search behavior explicitly temporary and provider-neutral, and tell the user if an auditor launch becomes necessary at the final MVP boundary.
