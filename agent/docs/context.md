# Project Context

## Snapshot
- Project: `u-msg`
- Workspace: `/Users/glebnikitin/work/code/u-msg`
- Active spec: `none`
- Next spec: `001`
- Canonical entrypoint: `./agent/docs/index.md`

## Current Reality
- Canonical protocol now uses `producer_key` for idempotency and service-owned `msg_id`, `chain_id`, and `seq`.
- `u-db` is ready as the MVP storage boundary; unread aggregation and cursor upsert remain application-side.

## Current Focus
- Start implementation from a protocol-first backend roadmap.
- Keep agent startup deterministic through `./agent/docs/index.md`.
- Preserve only shipped or explicitly accepted contracts in context files.

## Main Risks
- Letting UI contract, protocol rules, and storage assumptions drift apart.
- Expanding scope before the first spec is accepted.
