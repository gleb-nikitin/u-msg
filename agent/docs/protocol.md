# Protocol Contract

## Chain Model
- A chain is the linear conversation context for a request, report, or side task.
- New chains are for independent work; existing chains continue the same context.
- Only the latest position receives the next reply because the service assigns the next `seq`.
- Any participant may read full chain history for context.
- Only explicitly listed participants are notified per message.

## Identity Ownership
| Field | Owner | Meaning |
|---|---|---|
| `producer_key` | producer | Idempotency key for safe retries |
| `chain_id` | service on new chain, producer on continue | Conversation grouping |
| `seq` | service | Monotonic, gapless order within a chain |
| `msg_id` | service | Canonical `{chain_id}_{seq}` identifier |

## Message Fields
| Field | Rules |
|---|---|
| `from_id` | required, opaque sender identity |
| `notify` | required non-empty list of participant ids |
| `response_from` | optional single participant or `null` |
| `type` | `chat`, `event`, `status`, `error` |
| `event_type` | required when `type=event` |
| `external_ref` | optional external link/id |
| `summary` | always present in stored data |
| `content` | required full markdown/plain-text body |
| `meta` | optional valid JSON |

## Notify And Response
- `notify` says who should see a message.
- `response_from` says who is expected to act.
- `response_from` implies notification even if omitted from `notify`.
- `response_from = null` means informational only.

## Summary Contract
1. If sender provides `summary`, store it.
2. If sender omits it, generate v0 summary by stripping markdown and truncating `content` to 200 chars with `...` when needed.
3. Stored records must never have a null `summary`.

## Validation
- Required base fields: `producer_key`, `from_id`, `notify`, `type`, `content`.
- Hard protocol rules:
  - `producer_key` must be non-empty and contain no whitespace.
  - `from_id` and participant ids must be non-empty.
  - `notify` must be a non-empty list.
  - `content` must be non-empty.
  - `meta` must be valid JSON when supplied.
- Initial implementation defaults, not fixed protocol constraints:
  - `producer_key`: target up to 256 chars.
  - `from_id` and participant ids: target up to 128 chars.
  - `content`: target up to 100000 chars.
  - `summary`: target up to 300 chars when supplied.
  - `meta`: target up to 10000 chars serialized.
- Adjust numeric limits during implementation hardening based on real usage data.

## Exit Codes
| Code | Meaning |
|---|---|
| `0` | success or duplicate write |
| `2` | validation error |
| `3` | queue failure |
| `4` | chain error such as unknown `chain_id` |

## Write Result
- Success: `ok\t{msg_id}\t{chain_id}\t{seq}`
- Deduplicated retry: `dup\t{msg_id}\t{chain_id}\t{seq}`

## Read-State Model
- MVP read state is per participant per chain using a read cursor row in `mail_read_cursor`.
- Unread for participant `X` means `X` appears in `notify` or `response_from` for some message with `seq` greater than the stored cursor.
- Marking read can set the cursor to latest seq or through a specific seq.
- Delivery does not auto-mark as read; the consumer must do that explicitly.
