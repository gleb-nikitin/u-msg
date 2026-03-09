# Roadmap

## Current Status
- Active spec: `007`
- Next spec: `none`
- Specs `001` through `006` are accepted; Spec `007` is active as an append-only small-fixes stream.

## Build Sequence
1. Spec `001`: backend skeleton and storage adapter boundaries.
2. Spec `002`: chain write flows, validation, summary fallback, and duplicate handling.
3. Spec `003`: chain reads, unread aggregation, and mark-read cursor handling.
4. Spec `004`: WebSocket `new_message` delivery and API/UI wiring.
5. Spec `005`: search/session contract surfaces and operational validation without provider adapters.
6. Spec `006`: DB-prefix connection (`msg`) and UI contract mismatch alignment for real backend switch.
7. Spec `007`: append-only stream of small protocol-safe fixes.
8. Ongoing post-MVP in this repo: protocol hardening, contract compatibility, and integration-support assets for external adapter projects.

## Standing Rules
- Keep the backend thin and route all durable storage through shipped `u-db` commands.
- Match the UI contract exactly; avoid translation layers.
- Use the protocol contract as normative input for all request validation and stored message shape.
- Keep stored message shape and backend contracts provider-neutral so future adapters do not require protocol changes.
- Start all post-MVP execution from an accepted spec.
- LLM/provider adapter implementation is out of scope in this repository roadmap.

## Open Constraints
- No permanent session registry implementation is defined locally yet (see `agent/docs/kb.md`, section `Search/Session Follow-Up`).
- Search still uses the temporary Spec `005` contract surface; permanent implementation decomposition is tracked in `agent/docs/kb.md`, section `Search/Session Follow-Up`.
- Partial WebSocket streaming remains out of MVP scope unless a later spec explicitly adds it.
- Provider-specific integrations are handled outside this repository; this repo supports them via stable protocol contracts, examples, and compatibility checks only.

## Future Ideas
- UI follow-up ideas backlog (do not load by default): `/Users/glebnikitin/work/code/u-msg/agent/inbox/ideas-from-ui.md`

## MVP Acceptance
- Start a new chain and receive `{msg_id, chain_id, seq}`.
- Append to an existing chain with monotonically increasing `seq`.
- Duplicate writes with the same `producer_key` return `dup` with no side effects.
- List chains/inbox with correct unread counts.
- Read full chain history in order.
- Mark a chain read through a cursor update or initial cursor write.
- Auto-generate `summary` when omitted.
- Reject malformed writes with the correct error code class.
- Do not require any LLM/provider adapter to satisfy MVP acceptance.
