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
- Specs `001` through `003` are complete; specs `004` and `005` remain to be implemented.
- Search/session remain intentionally shallow until Spec `005` defines the temporary contract behavior and ops checks.
- Provider adapter work for Claude, OpenAI, and Ollama is intentionally deferred and still needs a later spec, with Ollama explicitly last.
- OpenAI adapter decomposition is still pending, but the current default is `Responses API`; `Agents SDK` is only a fallback if later requirements need OpenAI-native orchestration.

## Session Handoff
- date: 2026-03-08
- what changed: accepted Spec `003`, archived it, and advanced roadmap state to Spec `004` after re-verifying typecheck/tests and regression coverage for long-chain history, latest mark-read, list limits, and identifier/limit hardening.
- why: the previous acceptance blockers were closed in behavior and tests, so the read/unread contract is now stable enough to move into realtime wiring.
- risks: unread aggregation remains intentionally brute-force for MVP; realtime work must avoid adding a durable delivery layer; the always-on `u-msg-ui` launcher still occupies host ports `8000`, `8001`, and `5173`, so backend/UI integration must deliberately coordinate port ownership.
- next checks: summon one executor for Spec `004`, keep fan-out strictly in-process, verify event payload compatibility with UI expectations, and tell the user if an auditor launch becomes necessary at the next boundary.
