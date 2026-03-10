# Spec 008: Digest API (Per-Message Summaries Across Chains)

## Goal
Add a new additive read endpoint for compact per-message scanning across chains:
`GET /api/digest?for={participant_id}&limit={N}`.

## Context
- Specs `001` through `007` are accepted.
- This is post-MVP additive read functionality and must not alter existing contracts.
- Input contract source: `agent/inbox/digest-api-contract.md`.
- Repository scope remains protocol-only; no provider adapter logic is added here.

## Deliverables
| File | Action |
|------|--------|
| `src/routes/digest.ts` | Create |
| `src/app.ts` | Modify (route registration) |
| `src/services/digest.ts` | Create |
| `src/lib/protocol-types.ts` | Modify (digest entry/response types) |
| `tests/digest.test.ts` | Create |
| `agent/docs/integration.md` | Modify (endpoint contract) |
| `agent/docs/run.md` | Modify (test command) |
| `agent/docs/kb.md` | Modify (handoff + follow-up notes) |

## Interface
- `GET /api/digest?for={participant_id}&limit={N}`

### Query params
- `for` required, validated with `safeIdentifier`.
- `limit` optional, positive integer only; default `100`; hard max `500`.

### Response
Flat array sorted by `ts DESC`:
- `chain_id: string`
- `seq: number`
- `from_id: string`
- `summary: string` (as stored)
- `ts: string`
- `type: "chat" | "event" | "status" | "error"`

No `content` field in digest response.

## Behavior
1. Implement `GET /api/digest` as an additive endpoint; existing endpoints stay unchanged.
2. Reuse participant involvement logic aligned with `listChains`:
   - participant involved if appears in `notify`, `response_from`, or `from_id`.
3. Read from existing prefix-resolved mail table via current adapter flow (no `core_mail` naming).
4. Apply query validation:
   - `for` via `safeIdentifier`
   - `limit` positive int
   - cap limit at `500`
5. Return per-message summaries only (no message body/content).
6. Keep drill-down path explicit:
   - use existing `GET /api/chains/:chain_id/messages`
   - do not claim/support `?seq=N` in this spec.
7. Keep protocol guarantees unchanged (idempotency, existing read/write contracts, realtime payload).

## Constraints
- Do not modify existing endpoint response shapes.
- Do not introduce provider-specific fields.
- Do not add new storage tables.
- Do not expand read APIs with per-message `seq` query filtering in this spec.

## Acceptance Criteria
- [ ] 1. `GET /api/digest` exists and returns `200` with a flat summary-only list.
- [ ] 2. `for` uses `safeIdentifier`; invalid values return stable `400`.
- [ ] 3. `limit` defaults to `100`, enforces positive integer validation, and is capped at `500`.
- [ ] 4. Involvement semantics match chain list logic (`notify`/`response_from`/`from_id`).
- [ ] 5. Existing endpoints (`/api/chains`, `/api/inbox`, `/api/chains/:id/messages`) remain unchanged.
- [ ] 6. Typecheck and full tests pass.

## Verification
- `npm run typecheck`
- `npm test`
- `npm test -- digest`
- Live probe examples:
  - `curl "http://127.0.0.1:18080/api/digest?for=human"`
  - `curl "http://127.0.0.1:18080/api/digest?for=human&limit=50"`

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
