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
- Specs `001` and `002` are complete; specs `003` through `005` remain to be implemented.
- Search/session remain intentionally shallow until Spec `005` defines the temporary contract behavior and ops checks.
- Provider adapter work for Claude, OpenAI, and Ollama is intentionally deferred and still needs a later spec, with Ollama explicitly last.
- OpenAI adapter decomposition is still pending, but the current default is `Responses API`; `Agents SDK` is only a fallback if later requirements need OpenAI-native orchestration.

## Session Handoff
- date: 2026-03-08
- what changed: accepted Spec `002` after rebuild and live runtime verification, archived it, advanced the roadmap to Spec `003`, and recorded that no extra auditor launch was needed at the Spec `002` boundary.
- why: the write path now matches the canonical protocol both in tests and in the shipped runtime path, including malformed JSON classification, duplicate handling, summary fallback, queue-failure mapping, and `response_from`-implies-notify persistence.
- risks: Spec `003` can still over-engineer unread aggregation or blur the accepted adapter boundary; the always-on `u-msg-ui` launcher still occupies host ports `8000`, `8001`, and `5173`, so backend/UI integration must deliberately coordinate port ownership.
- next checks: summon one executor for Spec `003`, preserve the accepted write path and adapter boundary, keep unread aggregation brute-force for MVP, and explicitly tell the user if an auditor launch becomes necessary before moving on to Spec `004`.
