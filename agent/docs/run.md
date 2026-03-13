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
| `UMSG_MCP_ENABLED` | `true` | Register or skip the `POST /mcp` MCP endpoint |
| `UDB_WRITE_CMD` | `u-db-write` | Override u-db-write command path |
| `UDB_READ_CMD` | `u-db-read` | Override u-db-read command path |
| `UDB_UPDATE_CMD` | `u-db-update` | Override u-db-update command path |
| `UMSG_UDB_TABLE_PREFIX` | `msg` | Prefix for storage tables (`${prefix}-mail`, `${prefix}-mail_read_cursor`) |

## Stack (locked by spec 001)
- Runtime: Node.js + TypeScript (ESM)
- HTTP: Fastify 5
- WebSocket: @fastify/websocket 11
- Test runner: Vitest 3
- Dev runner: tsx

## Temporary Surface (Spec 005)
- `GET /api/search?q={query}&project={project?}` returns `200` with `{ results: [], query, scope, status: "not_wired" }`. Requires non-empty `q`; returns `400` otherwise.
- `GET /api/sessions` returns `200` with `{ sessions: [], status: "not_wired" }`.
- Both endpoints are explicitly temporary. The `status: "not_wired"` field signals to UI and future executors that real implementation is deferred.
- Follow-up for real search/session behavior is tracked in `kb.md`.

## Operational Validation
| Command | Purpose |
|---------|---------|
| `./agent/scripts/check-mvp.sh` | Validate all MVP endpoints and WS against a running server |

- Requires `UMSG_CHECK_URL` pointing at a running `u-msg` server (no default — port `8000` is occupied by the always-on stub). Example: `UMSG_CHECK_URL=http://localhost:18080 ./agent/scripts/check-mvp.sh`.
- Requires `curl` and `node` (with `ws` available transitively via `@fastify/websocket` in `node_modules`).
- Covers: health, search, sessions, chains (validation errors), inbox (validation errors), and WebSocket connection handshake.

## Validation
- `npm run typecheck` must pass before commits.
- `npm test` must pass before commits.
- `npm test -- mcp` runs MCP route tests (initialize, tools/list, tool calls, disable flag).
- `npm test -- write-message` runs write-flow tests only (mocked u-db, no live storage needed).
- `npm test -- read-state` runs read/unread/mark-read flow tests (mocked u-db, no live storage needed).
- `npm test -- digest` runs digest read-surface tests (summary-only projection, limits, and involvement semantics).
- `npm test -- realtime` runs WebSocket realtime fan-out tests (real WebSocket connections, mocked u-db).
- `npm run preflight` should pass before first backend work on a new machine.
- `UMSG_CHECK_URL=http://localhost:<port> ./agent/scripts/check-mvp.sh` validates the full backend surface against a running server.
- Use the always-on server ingress for UI-backed tests once the backend is ready to replace or coexist with the current stub path deliberately.
- After each executor completion, the user will re-index the project with Code Indexer; assume fresh index data is available after that handoff step.

## MCP Probe
- Local initialize probe:
  - `curl -X POST http://127.0.0.1:18080/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'`
- Local tools/list probe:
  - `curl -X POST http://127.0.0.1:18080/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -H 'Mcp-Protocol-Version: 2025-03-26' -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'`
