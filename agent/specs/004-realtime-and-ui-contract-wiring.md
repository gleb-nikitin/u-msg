# Spec 004: Realtime And UI Contract Wiring

## Goal
Add the MVP realtime path and finish the backend/UI contract wiring so newly written messages are pushed to subscribed participants without introducing streaming partials or provider-specific concepts.

## Context
- Depends on Specs `001` through `003`.
- UI requires `WS /ws/stream?participant={id}` and the `new_message` event shape documented in `agent/docs/integration.md`.
- Polling fallback already exists on the UI side, so backend realtime only needs reliable `new_message` delivery for MVP.

## Deliverables
| File | Action |
|------|--------|
| `src/ws/stream.ts` | Modify |
| `src/services/publish-new-message.ts` | Create |
| `src/services/write-message.ts` | Modify |
| `src/routes/chains.ts` | Modify |
| `test/realtime.test.ts` | Create |
| `agent/docs/run.md` | Modify |

## Interface
- `WS /ws/stream?participant={id}`
- Required outbound event:
  - `{ "type": "new_message", "chain_id": "...", "seq": number, "summary": "...", "from_id": "..." }`

## Behavior
1. Accept participant-scoped WebSocket subscriptions.
2. After a successful write, publish `new_message` only to participants who should see the message under the notify/response rules.
3. Use in-process fan-out only: maintain a local connection registry and push directly to connected sockets without a broker or durable delivery queue.
4. Keep the event payload strictly aligned with the documented UI contract.
5. Avoid sending partial-token or provider-stream events in MVP.
6. Ensure write success is not blocked by WebSocket delivery failure; storage remains the source of truth.

## Constraints
- Do not add partial streaming events in this spec.
- Do not auto-mark messages as read on delivery.
- Do not leak provider/session identifiers into WebSocket payloads.
- Do not add durable delivery tracking, broker infrastructure, or reconnect replay behavior in this spec.

## Acceptance Criteria
- [x] 1. Subscribed participants receive the documented `new_message` event after successful writes.
- [x] 2. Non-participants do not receive the event.
- [x] 3. A WebSocket delivery failure does not break the underlying durable write path.
- [x] 4. Event payload fields and enum values match the frozen UI contract exactly.

## Verification
- `npm run typecheck`
- `npm test -- realtime`
- Manual checks:
  - connect two participant subscriptions and write messages with different notify sets
  - confirm only expected subscribers receive `new_message`
  - confirm writes still succeed if one WebSocket client disconnects mid-flow

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
