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
- Spec `001` is complete; specs `002` through `005` remain to be implemented.
- Search/session remain intentionally shallow until Spec `005` defines the temporary contract behavior and ops checks.
- Provider adapter work for Claude, OpenAI, and Ollama is intentionally deferred and still needs a later spec, with Ollama explicitly last.
- OpenAI adapter decomposition is still pending, but the current default is `Responses API`; `Agents SDK` is only a fallback if later requirements need OpenAI-native orchestration.

## Session Handoff
- date: 2026-03-08
- what changed: accepted Spec `001`, verified the backend skeleton locally, archived the completed spec, moved the roadmap to Spec `002`, and recorded that the shared always-on server workspace at `/Users/glebnikitin/work/server` is available for integration testing with `u-msg-ui` already running there.
- why: the project now has both a working backend skeleton and a stable UI test surface, so backend work can move toward real UI-backed validation instead of isolated local-only checks.
- risks: Spec `002` can still damage the accepted boundary if route logic shells out directly or invents provider-facing fields; the always-on `u-msg-ui` launcher currently occupies host ports `8000`, `8001`, and `5173`, so backend/UI integration must deliberately coordinate port ownership.
- next checks: summon one executor for Spec `002`, require them to preserve the accepted skeleton and adapter boundary, allow targeted user questions on real blockers, and make sure any `chain-api.u-msg.local` validation explicitly accounts for the current stub on port `8000`; then audit `002` before deciding whether `003` should still stay sequential.
