# Project Context

## Snapshot
- Project: `u-msg`
- Workspace: `/Users/glebnikitin/work/code/u-msg`
- Active spec: `004`
- Next spec: `005`
- Canonical entrypoint: `./agent/docs/index.md`

## Current Reality
- Canonical protocol now uses `producer_key` for idempotency and service-owned `msg_id`, `chain_id`, and `seq`.
- `u-db` is ready as the MVP storage boundary; unread aggregation and cursor upsert remain application-side.
- Spec `001` is complete: the TypeScript/Fastify/Vitest backend skeleton, `u-db` adapter boundary, and structured placeholder routes are now in place.
- Spec `002` is complete: real write endpoints now persist through `u-db`, map queue/chain/validation errors stably, generate summary fallback, and enforce `response_from`-implies-notify semantics.
- Spec `003` is complete: read endpoints now return full chain history, mark-read uses targeted max-seq lookup, chain/inbox limit handling is explicit, and route boundaries enforce strict identifier and limit validation before building `u-db` filters.
- The shared always-on ingress workspace at `/Users/glebnikitin/work/server` is available for integration testing, and `u-msg-ui` is already running there behind nginx/launchd.
- Provider integrations are intentionally deferred; MVP stays provider-neutral so Claude, OpenAI, and Ollama adapters can be added later without protocol changes.
- Provider detail sources are split by channel: Claude material is available through the local/code-indexed knowledge base, OpenAI material should be gathered on demand from the web/official docs path, and Ollama remains the last adapter phase. Agents should ask the user before relying on provider-specific details.
- The current OpenAI adapter direction is `Responses API` as the primary backend surface, using `Conversations API` or `previous_response_id` for state; `Agents SDK` stays a later fallback if higher-level orchestration is needed.

## Current Focus
- Execute Spec `004` for realtime `new_message` fan-out and UI contract wiring on top of accepted write/read behavior.
- Use the always-on server environment as the default UI/integration test surface once the backend can replace the current stubbed `chain-api` path cleanly.
- Keep LLM/provider bridges out of MVP while preserving one protocol for major agent families and a later provider order of Claude, then OpenAI, then Ollama last.
- When OpenAI integration starts, design around `Responses` event streams and tool items first, not around SDK-specific session abstractions.
- Keep agent startup deterministic through `./agent/docs/index.md`.
- Preserve only shipped or explicitly accepted contracts in context files.

## Main Risks
- Letting UI contract, protocol rules, and storage assumptions drift apart.
- Letting Spec `004` introduce durable delivery semantics when the MVP contract only allows in-process WebSocket fan-out.
- Forgetting that the always-on `u-msg-ui` launcher currently occupies host ports `8000`, `8001`, and `5173`, which affects live backend validation through `chain-api.u-msg.local`.
- Letting provider-specific assumptions leak into MVP before the core protocol is accepted.
- Expanding scope before realtime wiring is stable and verified against the current UI contract.
