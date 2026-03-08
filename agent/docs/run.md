# Runbook

## When to Load
- Load when executing, validating, or turning roadmap items into specs.

## Current Commands
- Project scripts directory: `./agent/scripts/`
- No local `u-msg` runtime entrypoint is defined yet.
- External storage bootstrap: `/Users/glebnikitin/work/code/u-db/agent/scripts/init-hub-db.sh`
- External storage smoke test: `/Users/glebnikitin/work/code/u-db/agent/scripts/smoke-hub-mvp.sh`

## Validation
- Read `./agent/docs/index.md` before creating specs or implementation plans.
- Keep these files aligned:
  - `./agent/docs/product.md`
  - `./agent/docs/protocol.md`
  - `./agent/docs/integration.md`
  - `./agent/docs/roadmap.md`
- Validate backend assumptions against:
  - `/Users/glebnikitin/disk/u-msg/inbox/u-db-ready.md`
  - `/Users/glebnikitin/disk/u-msg/inbox/u-msg-ui-contract.md`

## Current State
- Context preparation is complete enough to begin spec `001`.
- Build, runtime, and project-local tests are not defined yet.
