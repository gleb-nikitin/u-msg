# Spec 006: DB Prefix Connection And UI Contract Alignment

## Goal
Connect `u-msg` to the new storage namespace path (`msg` prefix flow) and remove UI-blocking API contract mismatches so `u-msg-ui` can switch from stub to real backend without custom shims.

## Context
- Specs `001` through `005` are accepted.
- Current adapter calls are hardcoded to `hub-mail` and `hub-mail_read_cursor`.
- UI mismatch report is documented in `agent/inbox/2026-03-08-ui-contract-mismatches.md`.
- Repository scope remains protocol-only; no LLM/provider adapter implementation is included in this spec.

## Deliverables
| File | Action |
|------|--------|
| `src/config.ts` | Modify |
| `src/adapters/u-db.ts` | Modify |
| `src/lib/protocol-types.ts` | Modify |
| `src/lib/validate-message.ts` | Modify |
| `src/routes/chains.ts` | Modify |
| `src/services/list-chains.ts` | Modify |
| `src/services/write-message.ts` | Modify |
| `tests/app.test.ts` | Modify |
| `tests/write-message.test.ts` | Modify |
| `tests/read-state.test.ts` | Modify |
| `tests/realtime.test.ts` | Modify |
| `agent/docs/integration.md` | Modify |
| `agent/docs/run.md` | Modify |
| `agent/docs/kb.md` | Modify |

## Interface
- `GET /api/chains?participant={id}&limit={N}`
- `POST /api/chains`
- `POST /api/chains/{chain_id}/messages`
- New runtime env for storage namespace/prefix selection (exact name to be finalized in implementation, expected shape: table prefix with default `msg`).

## Behavior
1. Make `u-db` table prefix configurable in backend config and adapter calls so table targets are not hardcoded to `hub-*`.
2. Set post-MVP default prefix to `msg`, with explicit override support for local fallback/transition.
3. Align chain list response with UI contract by adding `participants` and `response_from`, and exposing UI-expected names (`last_summary`, `last_ts`) while preserving compatibility for current backend consumers.
4. Update message validation/write path so browser UI can omit `producer_key` and `from_id` in request body:
   - `from_id` defaults from `X-Participant-Id` header.
   - `producer_key` is server-generated if omitted.
5. Keep recipient semantics strict: at least one effective recipient must exist, where `response_from` can satisfy recipient presence when `notify` is empty.
6. Preserve idempotency behavior for callers that still provide explicit `producer_key`.
7. Update docs and tests so storage-prefix and UI-contract behavior are explicit and regression-protected.

## Constraints
- Do not add LLM/provider adapter code.
- Do not remove protocol-level idempotency semantics.
- Do not break accepted realtime event contract from Spec `004`.
- Do not remove legacy fields from chain list in this spec unless compatibility impact is explicitly addressed and tested.

## Acceptance Criteria
- [ ] 1. Backend storage calls can target the `msg` prefix path without hardcoded `hub-*` table names.
- [ ] 2. `GET /api/chains` includes UI-required fields (`participants`, `response_from`, `last_summary`, `last_ts`) with correct values.
- [ ] 3. `POST /api/chains` and `POST /api/chains/:chain_id/messages` succeed when UI omits `producer_key` and `from_id`, using server-side defaults.
- [ ] 4. Empty `notify` is accepted when `response_from` is present, and effective-recipient semantics remain valid.
- [ ] 5. Typecheck and full tests pass with updated contract coverage.

## Verification
- `npm run typecheck`
- `npm test`
- `UMSG_PORT=18080 npm run dev` + manual smoke against `u-msg-ui` chain flows
- `UMSG_CHECK_URL=http://127.0.0.1:18080 ./agent/scripts/check-mvp.sh`

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
