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
- Specs `001` through `007` are complete.
- Spec `008` complete: `GET /api/digest` is live; digest scan window fixed at 10_000 messages (same cap as chain-list); avoid per-message `?seq=` query semantics without a dedicated follow-up spec.
- Spec `009` complete: `POST /mcp` now exposes a thin MCP wrapper over local services with tools for chains, inbox, digest, read, write, and mark-read flows, gated by `UMSG_MCP_ENABLED`.
- LLM/provider adapter implementation is out of scope for this repository roadmap; those adapters should live in separate projects that consume the `u-msg` protocol.
- This repo should provide protocol compatibility guidance and integration-support artifacts for external adapter teams.
- `check-mvp.sh` requires explicit `UMSG_CHECK_URL` because the always-on stub occupies `:8000`. Dev server and live validation must use a different port (e.g. `UMSG_PORT=18080`).
- MCP SDK transport detail: `POST /mcp` requests must send `Accept: application/json, text/event-stream`; non-`initialize` calls also require `Mcp-Protocol-Version`. The Fastify route uses stateless transport with JSON response mode for request/response-style tool calls.
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
- date: 2026-03-13
- what changed: accepted Spec `009`; added MCP server support behind `POST /mcp`, wired conditional registration via `UMSG_MCP_ENABLED`, added MCP route tests, and installed `@modelcontextprotocol/sdk` with `zod@3`.
- why: expose the existing `u-msg` read/write services as MCP tools for LLM clients without adding loopback HTTP or new business logic.
- risks: the current MCP route is intentionally stateless and request/response oriented; future clients that depend on long-lived SSE streams or sessionful MCP semantics would need a follow-up spec.
- next checks: run a live `initialize` and `tools/list` probe against a real local server on a non-`8000` port, then validate an end-to-end `send_message` or `create_chain` call once storage is available.
- date: 2026-03-10
- what changed: implemented Spec `008` digest API surface with new `GET /api/digest?for={participant_id}&limit={N}` route/service, summary-only projection, limit default/cap behavior, and dedicated digest tests.
- why: add compact per-message scanning across involved chains without altering existing read/write/realtime contracts.
- risks: digest currently scans up to a fixed recent window (`10_000` messages) before filtering, consistent with existing chain-list brute-force behavior; very high-volume deployments may require future pagination/indexing work.
- next checks: verify live probe responses against a running backend (`/api/digest?for=human`, `/api/digest?for=human&limit=50`) and keep drill-down path anchored on `GET /api/chains/{chain_id}/messages`.
