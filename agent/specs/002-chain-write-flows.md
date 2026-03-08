# Spec 002: Chain Write Flows

## Goal
Implement durable chain creation and append flows that enforce the canonical protocol, generate fallback summaries, and preserve idempotent write behavior through `u-db`.

## Context
- Depends on Spec `001` for the backend skeleton, shared error shape, and `u-db` adapter boundary.
- MVP write behavior is fully defined in `agent/docs/protocol.md` and `agent/docs/integration.md`.
- UI expects exact write endpoints and JSON responses with `{msg_id, chain_id, seq}`.

## Deliverables
| File | Action |
|------|--------|
| `src/routes/chains.ts` | Modify |
| `src/services/write-message.ts` | Create |
| `src/lib/validate-message.ts` | Create |
| `src/lib/summary.ts` | Create |
| `src/lib/protocol-types.ts` | Modify |
| `src/adapters/u-db.ts` | Modify |
| `test/write-message.test.ts` | Create |
| `agent/docs/run.md` | Modify |

## Interface
- `POST /api/chains`
- `POST /api/chains/{chain_id}/messages`
- Required request header: `X-Participant-Id`
- Success response body: `{ "msg_id": "string", "chain_id": "string", "seq": number }`

## Behavior
1. Validate base protocol fields exactly as documented for `producer_key`, `from_id`, `notify`, `type`, `content`, and optional `meta`.
2. Enforce type-specific rules such as `event_type` being required for `type=event`.
3. Generate `summary` with the documented v0 fallback when callers omit it.
4. Call the `u-db` write path for both new-chain and append flows and parse `ok|dup\tmsg_id\tchain_id\tseq`.
5. Map duplicate writes to successful JSON responses with no extra side effects.
6. Map validation failures, queue failures, and unknown `chain_id` failures to stable HTTP error classes derived from the protocol exit-code rules.
7. Treat `u-db` exit code `3` as a retriable backend failure and return a retriable HTTP error such as `503`.
8. Keep provider-specific metadata out of top-level message fields; only canonical protocol fields are stored or returned here.

## Constraints
- Do not implement read-state, inbox aggregation, or WebSocket broadcast in this spec.
- Do not add provider-specific request fields for Claude, OpenAI, or Ollama.
- Do not bypass the shared `u-db` adapter.

## Acceptance Criteria
- [ ] 1. New-chain writes return canonical `{msg_id, chain_id, seq}` JSON and persist through the `u-db` adapter.
- [ ] 2. Append writes preserve monotonically increasing `seq` and return the same response shape.
- [ ] 3. Duplicate retries with the same `producer_key` return success semantics with no additional side effects.
- [ ] 4. Missing `summary` values are replaced with the documented v0 fallback before persistence.
- [ ] 5. Queue failures from `u-db` return a retriable HTTP error instead of a generic `500` response.
- [ ] 6. Malformed writes fail with stable validation/chain error mapping instead of generic `500` responses.

## Verification
- `npm run typecheck`
- `npm test -- write-message`
- Manual checks:
  - `POST /api/chains` with valid input
  - repeat the same write to confirm duplicate handling
  - `POST /api/chains/{chain_id}/messages` with a valid existing chain
  - invalid payloads for validation coverage

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
