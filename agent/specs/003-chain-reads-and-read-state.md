# Spec 003: Chain Reads And Read State

## Goal
Implement chain history reads, inbox/list surfaces, unread aggregation, and mark-read behavior on top of `mail` and `mail_read_cursor`.

## Context
- Depends on Spec `002` for stored message shape and write semantics.
- `u-db` does not provide unread aggregation or cursor upsert; both are application-side responsibilities.
- UI contract requires ordered chain history, inbox surfaces, and a read endpoint.

## Deliverables
| File | Action |
|------|--------|
| `src/routes/chains.ts` | Modify |
| `src/routes/inbox.ts` | Modify |
| `src/services/read-message-history.ts` | Create |
| `src/services/list-chains.ts` | Create |
| `src/services/list-inbox.ts` | Create |
| `src/services/mark-read.ts` | Create |
| `src/services/unread.ts` | Create |
| `src/adapters/u-db.ts` | Modify |
| `test/read-state.test.ts` | Create |
| `agent/docs/run.md` | Modify |

## Interface
- `GET /api/chains?participant={id}&limit={N}`
- `GET /api/chains/{chain_id}/messages`
- `GET /api/inbox?for={participant_id}`
- `POST /api/chains/{chain_id}/read`
- Read request body: `{ "participant": "string", "through": number | undefined }`
- Preferred read response: `204 No Content`

## Behavior
1. Read full chain history in ascending `seq` order from the storage adapter.
2. List chains/inbox using application-side unread aggregation over `mail` and `mail_read_cursor`.
3. Treat a message as unread when the participant appears in `notify` or `response_from` and the message `seq` is greater than the stored cursor.
4. Implement mark-read by reading the current cursor first, then choosing update vs write because `u-db` has no cursor upsert.
5. Support both "mark latest read" and "mark through specific seq" flows.
6. Keep the MVP unread implementation brute-force and in-process, with no caching or invalidation layer in this spec.
7. Keep response payloads aligned with UI expectations, especially `summary` and `type`.

## Constraints
- Do not add speculative storage schema beyond `mail` and `mail_read_cursor`.
- Do not treat delivery as an automatic read.
- Do not add search or session implementation in this spec.
- Do not add caching, background refresh, or invalidation logic to unread aggregation in MVP.

## Acceptance Criteria
- [x] 1. `GET /api/chains/{chain_id}/messages` returns full ordered chain history.
- [x] 2. `GET /api/chains` and `GET /api/inbox` return correct unread counts derived in application code.
- [x] 3. `POST /api/chains/{chain_id}/read` updates or creates a cursor correctly and returns `204 No Content`.
- [x] 4. Read/unread behavior matches the protocol rule that only explicit cursor updates mark a chain read.

## Verification
- `npm run typecheck`
- `npm test -- read-state`
- Manual checks:
  - create a chain, append messages for multiple participants, inspect inbox counts
  - mark a chain read and confirm unread counts drop as expected
  - mark through a partial `seq` and confirm later messages remain unread

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
