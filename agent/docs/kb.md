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
- Specs `001` through `005` are complete.
- Provider adapter work for Claude, OpenAI, and Ollama is intentionally deferred and still needs a later spec, with Ollama explicitly last.
- OpenAI adapter decomposition is still pending, but the current default is `Responses API`; `Agents SDK` is only a fallback if later requirements need OpenAI-native orchestration.
- `check-mvp.sh` requires explicit `UMSG_CHECK_URL` because the always-on stub occupies `:8000`. Dev server and live validation must use a different port (e.g. `UMSG_PORT=18080`).

## Search/Session Follow-Up
- Both `GET /api/search` and `GET /api/sessions` currently return `status: "not_wired"` with empty result arrays. This is the Spec `005` temporary surface.
- Real search implementation requires:
  - Deciding whether to search `u-db` content directly (full-text over `content`/`summary` fields) or build an external index.
  - Defining the result shape: at minimum `chain_id`, `msg_id`, `summary`, `ts`, and a relevance signal.
  - Scoping by `project` parameter — currently echoed but unused; needs a project/namespace model or passthrough to storage filter.
  - Participant-scoping: should search results be restricted to chains the caller participates in? Requires a participant identity mechanism on the search request.
- Real sessions implementation requires:
  - Defining what a "session" means in a provider-neutral context — it is not a provider session (Claude/OpenAI) but could be a UI grouping, a time-bounded activity window, or a chain-subset view.
  - Avoiding coupling to any provider session abstraction before the adapter layer exists.
  - Deciding ownership: is the session model application-side or does it need storage support in `u-db`?
- Neither endpoint should change its contract shape without a follow-up spec that defines the permanent model.

## Session Handoff
- date: 2026-03-08
- what changed: accepted Spec `005`, archived it, and closed MVP backend execution scope after verifying deterministic temporary `search`/`sessions` surfaces and the explicit `UMSG_CHECK_URL` operational check path.
- why: the remaining MVP contract surfaces are now implemented and documented with stable temporary behavior, and the full endpoint/WS check script passed against an explicit non-`8000` local server URL.
- risks: `search` and `sessions` are intentionally temporary (`status: "not_wired"`); replacing them without an accepted post-MVP spec could create model drift. Always-on `u-msg-ui` still occupies host ports `8000`, `8001`, and `5173`.
- next checks: no auditor launch needed now; create the next post-MVP spec (provider-adapter planning/implementation), then summon executor(s) against that new spec.
