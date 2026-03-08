# Runbook

## When to Load
- Load when executing, validating, or turning roadmap items into specs.

## Preflight (u-db)
- Run `/Users/glebnikitin/work/code/u-db/agent/scripts/init-hub-db.sh` before backend work.
- Run `/Users/glebnikitin/work/code/u-db/agent/scripts/smoke-hub-mvp.sh` after bootstrap; stop if it fails.
- Confirm `u-db-write`, `u-db-read`, `u-db-update` resolve from PATH.
- Quick preflight: `npm run preflight`

## Server Test Surface
- Shared always-on ingress workspace: `/Users/glebnikitin/work/server`
- Infra instructions: `/Users/glebnikitin/work/server/AGENTS.md`
- Always-on status: `bash /Users/glebnikitin/work/server/scripts/always-on.sh status`
- `u-msg-ui` is already available there for integration tests.
- Important: the current always-on launcher owns host ports `8000`, `8001`, and `5173`; real backend tests against `chain-api.u-msg.local` must account for the existing stub on `8000`.

## Dev Commands
| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server with hot reload (tsx watch, port 8000) |
| `npm start` | Start production server (requires `npm run build` first) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preflight` | Run u-db bootstrap + smoke test |

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `UMSG_PORT` | `8000` | Server listen port |
| `UMSG_HOST` | `0.0.0.0` | Server listen host |
| `UDB_WRITE_CMD` | `u-db-write` | Override u-db-write command path |
| `UDB_READ_CMD` | `u-db-read` | Override u-db-read command path |
| `UDB_UPDATE_CMD` | `u-db-update` | Override u-db-update command path |

## Stack (locked by spec 001)
- Runtime: Node.js + TypeScript (ESM)
- HTTP: Fastify 5
- WebSocket: @fastify/websocket 11
- Test runner: Vitest 3
- Dev runner: tsx

## Validation
- `npm run typecheck` must pass before commits.
- `npm test` must pass before commits.
- `npm test -- write-message` runs write-flow tests only (mocked u-db, no live storage needed).
- `npm test -- read-state` runs read/unread/mark-read flow tests (mocked u-db, no live storage needed).
- `npm run preflight` should pass before first backend work on a new machine.
- Use the always-on server ingress for UI-backed tests once the backend is ready to replace or coexist with the current stub path deliberately.
- After each executor completion, the user will re-index the project with Code Indexer; assume fresh index data is available after that handoff step.
