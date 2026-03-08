# Roadmap

## Current Status
- Active spec: `005`
- Next spec: `none`
- Specs `001` through `004` are accepted; spec `005` remains queued for implementation.

## Build Sequence
1. Spec `001`: backend skeleton and storage adapter boundaries.
2. Spec `002`: chain write flows, validation, summary fallback, and duplicate handling.
3. Spec `003`: chain reads, unread aggregation, and mark-read cursor handling.
4. Spec `004`: WebSocket `new_message` delivery and API/UI wiring.
5. Spec `005`: search/session contract surfaces and operational validation without provider adapters.
6. Post-MVP: provider bridge adapters in this order: Claude first, OpenAI next, local Ollama-compatible runtimes last.
   - OpenAI default path: `Responses API` plus `Conversations API` or `previous_response_id`.
   - OpenAI fallback path: `Agents SDK` only if later work needs OpenAI-native handoffs or higher-level orchestration.

## Immediate Requirements
- Keep the backend thin and route all durable storage through shipped `u-db` commands.
- Match the UI contract exactly; avoid translation layers.
- Use the protocol contract as normative input for all request validation and stored message shape.
- Treat application-side unread aggregation as required MVP work, not a future enhancement.
- Keep stored message shape and backend contracts provider-neutral so future adapters do not require protocol changes.

## Open Constraints
- No session registry implementation is defined locally yet.
- Search exists only as a contract surface; the implementation path still needs explicit decomposition.
- Partial WebSocket streaming remains out of MVP scope unless a later spec explicitly adds it.
- Provider-specific integration details are intentionally deferred; when that work starts, ask the user for the relevant source path, then use the code-indexed Claude KB first, gather OpenAI details from the web/official docs path when needed, and keep Ollama for the final adapter phase.
- For OpenAI specifically, prefer the lower-level provider-neutral adapter shape around `Responses` streaming, tool calls, and conversation state before considering `Agents SDK`.

## MVP Acceptance
- Start a new chain and receive `{msg_id, chain_id, seq}`.
- Append to an existing chain with monotonically increasing `seq`.
- Duplicate writes with the same `producer_key` return `dup` with no side effects.
- List chains/inbox with correct unread counts.
- Read full chain history in order.
- Mark a chain read through a cursor update or initial cursor write.
- Auto-generate `summary` when omitted.
- Reject malformed writes with the correct error code class.
- Do not require a Claude, OpenAI, or Ollama adapter to satisfy MVP acceptance.
