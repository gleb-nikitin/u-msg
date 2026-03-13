# Spec 009: MCP Server

## Goal
Add an MCP server to `u-msg` so MCP-capable clients (primarily LLMs) can read and write chain data through MCP tools instead of requiring hardcoded HTTP endpoint knowledge. This is a thin wrapper over existing services. No new business logic.

## Context
- Specs `001` through `008` are accepted. All HTTP API surfaces are stable.
- Existing service functions (`listChains`, `listInbox`, `listDigest`, `readMessageHistory`, `writeMessage`, `markRead`) are clean, testable, and accept a `UDbAdapter` as their first argument.
- The MCP layer calls these services directly — no loopback HTTP.
- Transport: Streamable HTTP via `POST /mcp` on the same Fastify server.
- MCP v1 is request/response tools only. No realtime notifications. No new backend behavior.
- Input contract source: `agent/docs/draft-mcp.md`.

## SDK
- Package: `@modelcontextprotocol/sdk` (v1.x, currently v1.27.1).
- Runtime dependency: `zod@3` (required by the SDK for tool input schemas).
- Key imports:
  - `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
  - `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`
- There is no official Fastify adapter. Wire manually via Fastify's raw `request.raw` / `reply.raw` Node objects passed to `transport.handleRequest()`. This is ~15 lines of glue, not a library gap.
- Use **stateless** transport (`sessionIdGenerator: undefined`). MCP clients for this server are LLMs making infrequent requests (~5 min apart). No session state needed.
- v2 of the SDK (split into `@modelcontextprotocol/server` + `@modelcontextprotocol/client`, zod v4) is pre-alpha. Stick with v1.

## Deliverables
| File | Action |
|------|--------|
| `src/mcp/server.ts` | Create — MCP server factory, tool definitions, tool handlers |
| `src/mcp/register.ts` | Create — Fastify route registration for `POST /mcp` transport |
| `src/config.ts` | Modify — add `mcp.enabled` config field |
| `src/app.ts` | Modify — conditionally register MCP route |
| `tests/mcp.test.ts` | Create |
| `package.json` | Modify — add `@modelcontextprotocol/sdk` and `zod@3` dependencies |
| `agent/docs/integration.md` | Modify — document MCP endpoint |
| `agent/docs/run.md` | Modify — add MCP test command and env var |
| `agent/docs/kb.md` | Modify — handoff notes |

## Interface

### Transport
- `POST /mcp` — Streamable HTTP (MCP JSON-RPC over HTTP).
- Single endpoint handles `initialize`, `tools/list`, and `tools/call`.
- Stateless: each request gets a fresh `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined`.

### Config
| Variable | Default | Purpose |
|----------|---------|---------|
| `UMSG_MCP_ENABLED` | `true` | Set to `false` to skip MCP route registration |

When disabled, `POST /mcp` is not registered. All other endpoints are unaffected.

### Deployment (out of scope)
- MCP runs on the same Fastify server as existing HTTP API (same port, same process).
- Once the real `u-msg` backend is deployed as an always-on service (replacing the current stub on `:8000`), MCP would be reachable at `chain-api.u-msg.local/mcp`. That switch is explicit infra work in the server workspace — not an automatic property of this spec.
- Deployment wiring (launcher script, launchd plist, nginx switchover) follows the `u-llm` pattern in `/Users/glebnikitin/work/server` and should be a separate task.

## Tool Set

### Firm decisions (not open questions)
- **Field names**: raw backend names. No renaming, no normalization facade.
- **Participant identity**: explicit `participant` parameter on write tools. No session-level identity.
- **Error mapping**: MCP tool errors carry `message` from backend, `data: { statusCode, code }` when available.
- **Response shape**: pass through service return values with minimal transformation.

### Read Tools

#### `list_chains`
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `participant` | `string` | yes | — |
| `limit` | `number` | no | `20` |

Calls: `listChains(udb, participant, limit)`
Returns: `InboxEntry[]` — raw backend shape.

#### `get_inbox`
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `participant` | `string` | yes | — |
| `limit` | `number` | no | `20` |

Calls: `listInbox(udb, participant, limit)`
Returns: `InboxEntry[]` — raw backend shape (same as `list_chains` but filtered to `unread_count > 0`).

#### `get_digest`
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `participant` | `string` | yes | — |
| `limit` | `number` | no | `50` |

Calls: `listDigest(udb, participant, limit)`
Returns: `DigestEntry[]` — fields: `chain_id`, `seq`, `from_id`, `summary`, `ts`, `type`.

Note: `listDigest` enforces its own hard cap of `500`. The MCP tool defaults to `50` for LLM-friendly payload sizes but allows up to `500`.

#### `read_chain`
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `chain_id` | `string` | yes | — |
| `limit` | `number` | no | — |

Calls: `readMessageHistory(udb, chainId, limit)`
Returns: `StoredMessage[]` — full message objects in `seq ASC` order.

### Write Tools

#### `send_message`
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `participant` | `string` | yes | — |
| `chain_id` | `string` | yes | — |
| `content` | `string` | yes | — |
| `notify` | `string[]` | yes | — |
| `response_from` | `string` | no | `null` |
| `summary` | `string` | no | — |
| `type` | `string` | no | `"chat"` |
| `event_type` | `string` | no | `null` |
| `external_ref` | `string` | no | `null` |
| `meta` | `object` | no | `null` |

Behavior:
1. Validate `participant` with `safeIdentifier`.
2. Build message body from params, defaulting `type` to `"chat"` when omitted.
3. Call `validateMessage(body, { from_id: participant, producer_key: defaultProducerKey() })`.
4. Call `writeMessage(udb, validated, chainId, publisher)`.
5. Return `WriteResult` — `{ msg_id, chain_id, seq }`.

Note: `participant` maps to the sender identity (`from_id`). This matches the HTTP `X-Participant-Id` semantics.

#### `create_chain`
Same params as `send_message` minus `chain_id`.

Behavior:
1. Same validation as `send_message`.
2. Call `writeMessage(udb, validated, undefined, publisher)` — `undefined` chainId triggers new chain creation.
3. Return `WriteResult` — `{ msg_id, chain_id, seq }`.

#### `mark_read`
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `chain_id` | `string` | yes | — |
| `participant` | `string` | yes | — |
| `through` | `number` | no | — |

Calls: `markRead(udb, chainId, participant, through)`
Returns: `{ success: true }` (MCP transport requires content; the HTTP layer returns `204`).

## Behavior

### MCP Server Setup (`src/mcp/server.ts`)
1. Export a factory function that accepts the app's `UDbAdapter` and `MessagePublisher`.
2. Create an `McpServer` instance from `@modelcontextprotocol/sdk/server/mcp.js`.
3. Register all 7 tools using `server.registerTool()` with zod schemas for input validation.
4. Each handler calls the existing service function directly, catches errors, and maps them to MCP tool errors.
5. Tool handler return format: `{ content: [{ type: "text", text: JSON.stringify(result) }] }`.
6. Return the configured `McpServer`.

### Fastify Registration (`src/mcp/register.ts`)
1. Export an async Fastify plugin function.
2. Create the MCP server via the factory, passing `udb` and `publisher` from app decorations.
3. Register `POST /mcp` as a Fastify route.
4. For each request: create a stateless `StreamableHTTPServerTransport`, connect to the MCP server, and call `transport.handleRequest(request.raw, reply.raw, request.body)`.
5. Mark the reply as sent (`reply.hijack()`) since the transport writes directly to the raw response.

### Error Mapping
When a service call throws:
- If the error is an `HttpError`: return MCP tool error with `isError: true`, text content containing `error.message`, and structured data `{ statusCode: error.statusCode, code: error.code }`.
- If the error is unknown: return MCP tool error with `isError: true` and text `"Internal error"`.

### Input Validation
- Read tool `participant` and `chain_id` params: validate with `safeIdentifier` before calling services.
- Write tool params: delegate to `validateMessage` (which already does full validation).
- `limit` params: zod schema enforces positive integer. Tool handler applies tool-specific defaults from the table above.
- Do not duplicate deep validation in the MCP layer. Let services and `validateMessage` remain the source of truth.

### Config (`src/config.ts`)
Add to `Config` interface:
```typescript
mcp: {
  enabled: boolean;
};
```
Add to `loadConfig`:
```typescript
mcp: {
  enabled: process.env.UMSG_MCP_ENABLED !== "false",
},
```

### App Wiring (`src/app.ts`)
After existing route registrations, conditionally register MCP:
```typescript
if (config.mcp.enabled) {
  await app.register(mcpRoutes);
}
```

## Constraints
- No new storage tables.
- No new storage queries.
- No new business logic — MCP tools compose existing service functions only.
- No field renaming or response reshaping beyond what is listed (the `mark_read` success wrapper).
- No realtime/notification MCP features in this spec.
- No `read_message` (single message by seq) tool — clients use `read_chain`.
- Do not modify existing HTTP endpoint behavior or response shapes.
- Do not introduce MCP session-level participant identity. Keep explicit `participant` param.
- Keep `src/mcp/` self-contained; existing files outside `src/mcp/` should have minimal changes (config field + conditional registration).
- Deployment wiring (always-on launcher, launchd plist) is out of scope for this spec.

## Acceptance Criteria
- [ ] 1. `POST /mcp` responds to MCP `initialize` and `tools/list` requests when `UMSG_MCP_ENABLED` is not `false`.
- [ ] 2. `POST /mcp` is not registered when `UMSG_MCP_ENABLED=false`.
- [ ] 3. `list_chains` tool returns `InboxEntry[]` with raw backend field names.
- [ ] 4. `get_inbox` tool returns only chains with `unread_count > 0`.
- [ ] 5. `get_digest` tool returns `DigestEntry[]` with summary-only projection.
- [ ] 6. `read_chain` tool returns `StoredMessage[]` in `seq ASC` order.
- [ ] 7. `send_message` tool writes to an existing chain and returns `WriteResult`.
- [ ] 8. `create_chain` tool creates a new chain and returns `WriteResult`.
- [ ] 9. `mark_read` tool updates read cursor; `through` param works when provided.
- [ ] 10. Write tools use `participant` as sender identity (maps to `from_id`).
- [ ] 11. Backend validation errors surface as MCP tool errors with `{ statusCode, code }` in data.
- [ ] 12. Existing HTTP endpoints (`/api/chains`, `/api/inbox`, `/api/digest`, etc.) remain unchanged.
- [ ] 13. `npm run typecheck` passes.
- [ ] 14. `npm test` passes (existing + new MCP tests).

## Testing (`tests/mcp.test.ts`)
Tests use `app.inject()` against `POST /mcp` with MCP JSON-RPC payloads (same pattern as existing route tests with mocked `UDbAdapter`).

Required test coverage:
1. `tools/list` returns all 7 tools.
2. Each read tool returns expected shape with mocked adapter data.
3. Each write tool calls the correct service and returns expected result.
4. `mark_read` with and without `through`.
5. Invalid `participant` returns MCP tool error.
6. MCP route absent when config `mcp.enabled` is `false`.

## Verification
- `npm run typecheck`
- `npm test`
- `npm test -- mcp`
- Live probe (against a running server):
  - `curl -X POST http://127.0.0.1:18080/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'`
- Via proxy (requires real backend deployed behind `chain-api.u-msg.local`):
  - `curl -X POST http://chain-api.u-msg.local/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'`

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
