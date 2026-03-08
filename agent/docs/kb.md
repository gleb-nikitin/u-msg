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
- Specs `001` through `006` are complete.
- LLM/provider adapter implementation is out of scope for this repository roadmap; those adapters should live in separate projects that consume the `u-msg` protocol.
- This repo should provide protocol compatibility guidance and integration-support artifacts for external adapter teams.
- `check-mvp.sh` requires explicit `UMSG_CHECK_URL` because the always-on stub occupies `:8000`. Dev server and live validation must use a different port (e.g. `UMSG_PORT=18080`).
- UI mismatch source for Spec `006`: `agent/inbox/2026-03-08-ui-contract-mismatches.md`.
- Spec `006` implementation notes: adapter table targets are now prefix-driven (`UMSG_UDB_TABLE_PREFIX`, default `msg`), `/api/chains` now includes UI fields (`participants`, `response_from`, `last_summary`, `last_ts`) alongside legacy fields, and write endpoints default missing `from_id`/`producer_key` server-side.

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
- what changed: accepted Spec `006`, added archive/state closure, and shipped DB-prefix + UI contract alignment in backend behavior and tests.
- why: unblocks switching `u-msg-ui` from stub to real backend by removing hardcoded `hub-*` table targets and matching UI-required chain/write contract expectations.
- risks: changing compatibility fields/defaults can still regress external consumers if future edits remove legacy fields or header-derived defaults without a transition spec; always-on `u-msg-ui` still occupies host ports `8000`, `8001`, and `5173`.
- next checks: run live `u-msg-ui` smoke against this backend path, then define the next post-MVP protocol-support spec (keep provider adapters out of repo scope).
