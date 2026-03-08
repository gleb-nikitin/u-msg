# Context Index

Use this file as the startup entrypoint for no-history agents.

## Load Order
1. `./agent/docs/context.md` — current snapshot and active risks.
2. `./agent/docs/roadmap.md` — what to build first and MVP acceptance targets.
3. `./agent/docs/product.md` — system purpose, architecture, scope, and boundaries.
4. `./agent/docs/protocol.md` — normative chain/message/read-state rules.
5. `./agent/docs/integration.md` — shipped `u-db` behavior, UI/backend contract, and local infra.
6. `./agent/docs/run.md` — validation commands and external scripts.
7. `./agent/docs/kb.md` — handoff notes and lightweight debt tracking.

## Canonical Rules
- Prefer newer donor documents over older roadmap prose when they conflict.
- Treat `producer_key` as the idempotency key; `msg_id`, `chain_id`, and `seq` are service-owned.
- Treat shipped `u-db` behavior as the storage truth for MVP planning.
- Keep UI contract facts in `integration.md`, not in protocol files.
- Keep only one canonical home per topic; add links instead of repeating content.

## Source Set
- `/Users/glebnikitin/disk/u-msg/inbox/context-injection.md`
- `/Users/glebnikitin/disk/u-msg/inbox/agent-hub-protocol-addendum.md`
- `/Users/glebnikitin/disk/u-msg/inbox/agent-hub-roadmap-final.md`
- `/Users/glebnikitin/disk/u-msg/inbox/u-db-ready.md`
- `/Users/glebnikitin/disk/u-msg/inbox/u-msg-ui-contract.md`
