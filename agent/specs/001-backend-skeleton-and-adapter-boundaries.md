# Spec 001: Backend Skeleton And Adapter Boundaries

## Goal
Create the first runnable `u-msg` backend skeleton and lock the storage/integration boundaries so later work can implement protocol behavior without re-deciding the runtime shape.

## Context
- The repo currently contains only roadmap/context docs and no runtime entrypoint.
- MVP requires a thin backend on `:8000` that matches the frozen UI contract and routes durable work through shipped `u-db` commands.
- Provider bridges remain out of scope; the first backend should stay provider-neutral.
- This spec chooses Node.js + TypeScript for the backend because later Claude/OpenAI adapters and WebSocket/event streaming fit that runtime cleanly without extra bridge layers.
- This spec is also a decisions spec: it locks the first backend stack choices so later specs inherit one HTTP framework, one WebSocket path, and one test runner.

## Deliverables
| File | Action |
|------|--------|
| `package.json` | Create |
| `tsconfig.json` | Create |
| `src/server.ts` | Create |
| `src/app.ts` | Create |
| `src/config.ts` | Create |
| `src/lib/http-errors.ts` | Create |
| `src/lib/protocol-types.ts` | Create |
| `src/adapters/u-db.ts` | Create |
| `src/routes/health.ts` | Create |
| `src/routes/chains.ts` | Create |
| `src/routes/inbox.ts` | Create |
| `src/routes/search.ts` | Create |
| `src/routes/sessions.ts` | Create |
| `src/ws/stream.ts` | Create |
| `agent/docs/run.md` | Modify |

## Interface
- Runtime: HTTP backend listening on port `8000`.
- Required route registration:
  - `GET /api/chains`
  - `GET /api/chains/{chain_id}/messages`
  - `POST /api/chains`
  - `POST /api/chains/{chain_id}/messages`
  - `GET /api/inbox`
  - `POST /api/chains/{chain_id}/read`
  - `GET /api/search`
  - `GET /api/sessions`
  - `WS /ws/stream`
- Add a backend-local health route for operations, for example `GET /healthz`.

## Behavior
1. Before backend coding starts, verify the local `u-db` preconditions by running the frozen bootstrap and smoke scripts and stop immediately if they do not work on the executor machine.
2. Bootstrap a TypeScript service with one app entrypoint, environment config, and shared error handling.
3. Use `Fastify` as the HTTP framework for the initial backend.
4. Use `@fastify/websocket` for `WS /ws/stream` and keep WebSocket handling inside the backend process.
5. Use `Vitest` as the default local test runner.
6. Register all contract routes and the WebSocket endpoint, even if unfinished handlers return a structured temporary error.
7. Create a single `u-db` adapter boundary responsible for invoking shipped `u-db-*` commands and parsing stdout/exit-code results.
8. Keep route handlers thin and prevent route modules from shelling out directly to `u-db`.
9. Resolve `u-db-*` commands through the runtime environment, defaulting to `PATH` lookup with backend-local overrides for machines where command names or locations differ.
10. Treat unexpected `u-db` stdout/stderr format as adapter failure and surface one stable backend error instead of guessing.
11. Keep `u-db` invocation per call in MVP; do not introduce a long-running drain/process manager inside the backend in this spec.
12. Add shared protocol and error types that later specs reuse for writes, reads, and read-state flows.
13. Define local dev/typecheck/test scripts in `package.json` and document them in `agent/docs/run.md`.

## Constraints
- Do not implement provider bridges, SDK sessions, or model-specific logic.
- Do not hard-code UI presentation logic into backend responses.
- Do not implement business logic inside the `u-db` adapter beyond command invocation and result parsing.
- Do not ship partial-stream WebSocket events in this spec.
- Do not change the chosen stack without explicit acceptance of a spec update.

## Acceptance Criteria
- [x] 1. The repo has a runnable TypeScript backend skeleton on `:8000` with all MVP HTTP routes and `WS /ws/stream` registered.
- [x] 2. `Fastify`, `@fastify/websocket`, and `Vitest` are the locked initial stack choices for later specs.
- [x] 3. A dedicated `u-db` adapter exists and is the only backend layer allowed to invoke `u-db-*` commands.
- [x] 4. Unimplemented routes fail deterministically with one structured backend error shape rather than ad hoc placeholders.
- [x] 5. Local run, typecheck, and test commands are documented in `agent/docs/run.md`, including the `u-db` preflight checks.

## Verification
- `/Users/glebnikitin/work/code/u-db/agent/scripts/init-hub-db.sh`
- `/Users/glebnikitin/work/code/u-db/agent/scripts/smoke-hub-mvp.sh`
- `npm install`
- `npm run typecheck`
- `npm test`
- `npm run dev`
- Confirm `GET /healthz` succeeds and each contract route returns either a valid placeholder response or a structured not-yet-implemented error.
