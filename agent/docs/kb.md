# Knowledge Base

## Lazy-Load Index
- `./agent/docs/index.md` — canonical entrypoint and loading order.
- `./agent/docs/product.md` — product purpose, architecture, scope, and design rules.
- `./agent/docs/protocol.md` — normative chain/message/read-state contract.
- `./agent/docs/integration.md` — shipped `u-db` facts, UI/backend contract, and local infrastructure.
- `./agent/docs/roadmap.md` — implementation sequence and MVP acceptance criteria.
- `./agent/docs/run.md` — execution and validation commands.
- `./agent/docs/context.md` — cold-start snapshot.

## Known Debt
- No accepted implementation spec exists yet.
- Search/session handling remain defined at the contract level but not decomposed into approved specs.

## Session Handoff
- date: 2026-03-08
- what changed: established a canonical docs index and split project context into product, protocol, integration, and roadmap files.
- why: agents need one compact, conflict-free startup path with one source of truth per topic.
- risks: roadmap sequencing is ready to start, but no spec has been accepted yet and sessions/search still need explicit decomposition.
- next checks: create spec `001` for backend skeleton plus storage adapter boundaries, then validate each API path against the frozen `u-db` flow and UI contract.
