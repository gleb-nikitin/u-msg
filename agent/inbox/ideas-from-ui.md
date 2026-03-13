# Notes from u-msg-ui: middleware concerns for u-msg

Date: 2026-03-08
Source: u-msg-ui team (after auditing u-db storage contract v1 against UI requirements)

These are **not** u-db issues. They are middleware-level concerns for u-msg to address when implementing the API layer on top of `core_mail` and `core_mail_read_cursor`.

---

## 1. Chain-level aggregation is expensive without a summary table

The UI calls `GET /api/chains?participant={id}` and expects:

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

All of these must be derived from `core_mail` per-request:
- `last_summary`, `last_ts`, `response_from` → from the max-seq message per chain
- `participants` → distinct union of `from_id` + all entries in `notify` JSON arrays across the chain
- `unread_count` → count of messages where `seq > read_through_seq` AND participant in `notify`

For v0 with small data this is fine. At scale, consider a **`core_chain_summary`** materialized table that u-msg updates on each write. Fields: `chain_id, last_seq, last_ts, last_summary, last_response_from, participants_json`. Updated atomically with each `core_mail` insert.

---

## 2. "Find all chains involving participant X" requires scanning notify JSON

The `notify` column in `core_mail` is a json-string array. There is no index on array elements. To answer "which chains does participant X belong to?", middleware must either:

- **Option A:** Scan `core_mail` with JSON functions (slow at scale)
- **Option B:** Maintain a **`core_chain_participant`** lookup table (`chain_id, participant_id`, unique pair). Updated on each write when a new participant appears in `from_id` or `notify`. This makes the chains-for-participant query a simple indexed lookup.
- **Option C:** In-memory cache (acceptable for v0 with small data)

Recommendation: Option B is cheap to implement and scales well. Could be added to u-db contract v2 or maintained purely in u-msg middleware.

---

## 3. Per-chain UI state (stars, pins) needs a home

The u-db contract provides `ui_profile` (per-participant: `settings` json, `address_book` json). This covers global preferences.

But the UI also needs **per-chain** state per participant:
- Star/pin a specific chain
- Possibly: mute, archive, custom labels per chain

Options:
- **v0:** Store starred chain IDs as a list inside `ui_profile.settings` JSON. Simple, no schema change.
- **Later:** Add a `ui_chain_state` table (`participant_id, chain_id, starred, muted, labels_json`). Better for queries like "show me all starred chains".

Not blocking — v0 can use the JSON blob approach.

---

## 4. Full-text search is not in the DB contract

The UI has `GET /api/search?q={query}` which searches message content and summaries. The u-db storage contract does not include FTS infrastructure.

Options for u-msg middleware:
- SQLite FTS5 virtual table mirroring `core_mail.summary` + `core_mail.content`
- External search (MCP search_code integration as mentioned in roadmap)
- Simple LIKE queries for v0

This is entirely u-msg's domain per the contract boundary (section 8).

---

## 5. Sessions are runtime, not stored — confirmed correct

`GET /api/sessions` returns active agent sessions (active/idle/dead). These are ephemeral runtime state, not persisted data. The DB contract correctly does not include a sessions table. u-msg should track these in memory or via `ops_event_log` for diagnostics.
