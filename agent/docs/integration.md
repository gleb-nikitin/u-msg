# Integration Contracts

## u-db Reality
- `u-db` is the MVP storage boundary and is considered ready for `u-msg`.
- Shipped commands: `u-db-write`, `u-db-read`, `u-db-update`, `u-db-create`, `u-db-drain`.
- Expected hub tables: `mail`, `mail_read_cursor`.
- New/continue writes return `ok|dup\tmsg_id\tchain_id\tseq`.
- Unknown `chain_id` returns exit code `4`.
- There is no unread aggregation in `u-db`; `u-msg` computes unread counts in application memory.
- There is no cursor upsert; mark-read must read cursor first, then choose update vs write.

## Frozen External References
- Storage bootstrap: `/Users/glebnikitin/work/code/u-db/agent/scripts/init-hub-db.sh`
- Storage smoke test: `/Users/glebnikitin/work/code/u-db/agent/scripts/smoke-hub-mvp.sh`
- Backend recipes: `/Users/glebnikitin/work/code/u-db/agent/roadmap/u-msg-backend-recipes.md`
- Ops note: `/Users/glebnikitin/work/code/u-db/agent/how-to/hub-mvp-ops.md`

## Backend API Expected By UI
- `GET /api/chains?participant={id}&limit={N}`
- `GET /api/chains/{chain_id}/messages`
- `POST /api/chains`
- `POST /api/chains/{chain_id}/messages`
- `GET /api/inbox?for={participant_id}`
- `POST /api/chains/{chain_id}/read`
- `GET /api/search?q={query}&project={project?}`
- `GET /api/sessions`
- `WS /ws/stream?participant={id}`

## Request/Response Notes
- All write calls send `X-Participant-Id` and the JSON message body defined by the protocol.
- Write responses are JSON: `{ "msg_id": "string", "chain_id": "string", "seq": 0 }`.
- Read request body: `{ "participant": "string", "through": number | undefined }`.
- Preferred read response: `204 No Content`.
- UI requires `summary` on every message and exact enum values for `type`.

## Realtime
- Required WebSocket event: `{ "type": "new_message", "chain_id": "...", "seq": 0, "summary": "...", "from_id": "..." }`
- UI may also consume `partial` events later, but partial streaming is not part of MVP backend scope.
- If WebSocket fails, UI falls back to polling inbox about every 7 seconds.

## Local Infra
- `chain-api.u-msg.local` proxies to backend `:8000`.
- `ui-api.u-msg.local` proxies to frontend-owned UI-state API `:8001`.
- `ui.u-msg.local` proxies to Vite dev server `:5173`.
- Backend swaps from stub to real service through nginx proxy changes, with no UI contract changes.
