# Project Context

## Snapshot
- Project: `u-msg`
- Workspace: `/Users/glebnikitin/work/code/u-msg`
- Active spec: `none`
- Last finished: `008`
- Next spec: `none`
- Canonical entrypoint: `./agent/docs/index.md`

## Current Reality
- Canonical protocol now uses `producer_key` for idempotency and service-owned `msg_id`, `chain_id`, and `seq`.
- `u-db` is ready as the MVP storage boundary; unread aggregation and cursor upsert remain application-side.
- Spec `001` is complete: the TypeScript/Fastify/Vitest backend skeleton, `u-db` adapter boundary, and structured placeholder routes are now in place.
- Spec `002` is complete: real write endpoints now persist through `u-db`, map queue/chain/validation errors stably, generate summary fallback, and enforce `response_from`-implies-notify semantics.
- Spec `003` is complete: read endpoints now return full chain history, mark-read uses targeted max-seq lookup, chain/inbox limit handling is explicit, and route boundaries enforce strict identifier and limit validation before building `u-db` filters.
- Spec `004` is complete: realtime `new_message` fan-out is wired through an in-process publisher, WebSocket subscriptions are participant-scoped and normalized, and duplicate notify deliveries are deduplicated before publish.
- Spec `005` is complete: temporary deterministic search/session responses are now explicit, MVP operational checks are scripted, and unresolved permanent search/session model decisions are centralized in KB follow-up notes.
- The shared always-on ingress workspace at `/Users/glebnikitin/work/server` is available for integration testing, and `u-msg-ui` is already running there behind nginx/launchd.
- LLM/provider adapter implementation is now out of scope for this repository roadmap. `u-msg` is protocol-first and provider-neutral, and external projects should integrate against its contracts.

## Current Focus
- All specs 001-008 accepted; no active spec.
- Use the always-on server environment as the default UI/integration test surface once the backend can replace the current stubbed `chain-api` path cleanly.
- Accept protocol-only requests and help external teams integrate the protocol without adding in-repo provider adapter code.
- Keep agent startup deterministic through `./agent/docs/index.md`.
- Preserve only shipped or explicitly accepted contracts in context files.

## Main Risks
- Letting UI contract, protocol rules, and storage assumptions drift apart.
- Re-introducing in-repo provider adapter scope would blur boundaries and create ownership drift.
- Implementing UI compatibility by breaking accepted protocol behavior instead of layering backward-compatible response/default logic.
- Forgetting that the always-on `u-msg-ui` launcher currently occupies host ports `8000`, `8001`, and `5173`, which affects live backend validation through `chain-api.u-msg.local`.
- Letting provider-specific assumptions leak into protocol contracts.
- Expanding scope without preserving the now-explicit temporary `search`/`sessions` contract until a replacement model is accepted.
