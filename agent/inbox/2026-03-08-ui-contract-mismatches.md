# UI → u-msg: contract mismatches blocking real backend switch

Date: 2026-03-08
Source: u-msg-ui team
Priority: blocking — UI cannot connect to real backend until resolved

Reference contract: `/Users/glebnikitin/work/code/u-msg-ui/agent/roadmap/backend-connect.md`

---

## Blockers

### 1. `GET /api/chains` response shape mismatch

UI expects (per `backend-connect.md`):
```json
{
  "chain_id": "...",
  "last_summary": "...",
  "last_ts": "...",
  "unread_count": 3,
  "participants": ["human", "billing-backend"],
  "response_from": "human"
}
```

u-msg currently returns (`InboxEntry`):
```json
{
  "chain_id": "...",
  "latest_ts": "...",
  "latest_summary": "...",
  "latest_from_id": "...",
  "unread_count": 3,
  "max_seq": 5
}
```

Missing fields:
- **`participants: string[]`** — UI uses this to display chain member names in the left panel and to populate `notify` when replying within a chain. Without it, the UI cannot render the chain list or send replies.
- **`response_from: string | null`** — UI uses this for attention-priority sorting: chains where `response_from === currentUser` are sorted to the top as "action needed". Without it, inbox sorting is broken.

Renamed fields:
- `last_summary` → `latest_summary`
- `last_ts` → `latest_ts`

Extra fields the UI does not use (harmless):
- `latest_from_id`, `max_seq`

**Fix needed in u-msg:** add `participants` and `response_from` to `listChains` output. Align field names with `backend-connect.md` (`last_summary`, `last_ts`) or notify UI team to adapt.

The `participants` list = distinct union of `from_id` + all entries in `notify` arrays across all messages in the chain. The `response_from` = value from the latest message (max seq) in the chain.

---

### 2. `POST /api/chains` and `POST /api/chains/:id/messages` — missing required body fields

UI sends:
```json
{
  "notify": ["billing-backend"],
  "response_from": "billing-backend",
  "type": "chat",
  "content": "message body",
  "summary": "optional topic"
}
```
Plus header: `X-Participant-Id: human`

u-msg `validateMessage` requires in body:
- **`producer_key`** — required, non-empty, no whitespace, <= 256 chars
- **`from_id`** — required, non-empty, <= 128 chars

UI does not send either field → u-msg returns 400.

**Recommended fix in u-msg:** make both fields optional in body with server-side defaults:
- `producer_key`: if omitted, generate a UUID (or `${from_id}-${Date.now()}`)
- `from_id`: if omitted, read from `X-Participant-Id` header (which u-msg already validates)

This keeps the fields available for agent/service callers who want idempotency control, while allowing browser UI to skip them.

Alternative fix in UI: generate `producer_key` (uuid) and send `from_id` in body. This is possible but less clean — the UI should not need to know about idempotency keys.

---

### 3. `notify` must be non-empty — conflicts with new chain creation

`validateMessage` throws 400 if `notify` is an empty array. But the UI's "New Chain" form (spec 004) allows the user to fill only `response_from` and leave `notify` empty.

u-msg's `writeMessage` already handles this partially: it adds `response_from` to `notify` if not present. But the validation gate runs **before** `writeMessage`, so the request is rejected before reaching that logic.

**Fix needed in u-msg:** move the `response_from → notify` merge into validation, or relax validation to allow empty `notify` when `response_from` is provided. The semantic rule is: at least one recipient must exist (either in `notify` or as `response_from`).

---

## Non-blockers (for awareness)

### 4. `GET /api/chains/:id/messages` — extra `producer_key` field
u-msg returns `StoredMessage` which includes `producer_key`. UI's Zod schema strips unknown fields. No breakage.

### 5. WebSocket `connected` event
u-msg sends `{ type: "connected", participant: "..." }` on WS open. UI only processes `type: "new_message"`. No breakage.

### 6. `POST /api/chains/:id/read` — `through` validation
u-msg requires `through >= 1` when provided. UI sends seq numbers or omits the field. Compatible.

---

## Summary

Three fixes needed in u-msg before UI can switch from stub to real backend:

| # | What | Where in u-msg |
|---|------|---------------|
| 1 | Add `participants` + `response_from` to chain list response | `services/list-chains.ts`, `lib/protocol-types.ts` |
| 2 | Make `producer_key` + `from_id` optional in body (default from header/uuid) | `lib/validate-message.ts` |
| 3 | Allow empty `notify` when `response_from` is present | `lib/validate-message.ts` |

After these fixes, the UI switch is a single nginx config change: `proxy_pass http://host.docker.internal:8000` already points to the right port.
