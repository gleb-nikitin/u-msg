# Roadmap

## Current Status
- Active spec: `none`
- Next spec: `001`
- Context set is ready to support spec decomposition and implementation start.

## Build Sequence
1. Spec `001`: backend skeleton and storage adapter boundaries.
2. Spec `002`: chain write flows, validation, summary fallback, and duplicate handling.
3. Spec `003`: chain reads, unread aggregation, and mark-read cursor handling.
4. Spec `004`: WebSocket `new_message` delivery and API/UI wiring.
5. Spec `005`: search/session surfaces and operational validation.

## Immediate Requirements
- Keep the backend thin and route all durable storage through shipped `u-db` commands.
- Match the UI contract exactly; avoid translation layers.
- Use the protocol contract as normative input for all request validation and stored message shape.
- Treat application-side unread aggregation as required MVP work, not a future enhancement.

## Open Constraints
- No session registry implementation is defined locally yet.
- Search exists only as a contract surface; the implementation path still needs explicit decomposition.
- Partial WebSocket streaming remains out of MVP scope unless a later spec explicitly adds it.

## MVP Acceptance
- Start a new chain and receive `{msg_id, chain_id, seq}`.
- Append to an existing chain with monotonically increasing `seq`.
- Duplicate writes with the same `producer_key` return `dup` with no side effects.
- List chains/inbox with correct unread counts.
- Read full chain history in order.
- Mark a chain read through a cursor update or initial cursor write.
- Auto-generate `summary` when omitted.
- Reject malformed writes with the correct error code class.
