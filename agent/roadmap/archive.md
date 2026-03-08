# Completed Specs
# Append newest first.

## 003-chain-reads-and-read-state
- accepted: 2026-03-08
- outcome: chain history reads, chain/inbox unread aggregation, and mark-read cursor handling are implemented; long-chain truncation and silent list limits were removed, latest mark-read uses targeted max-seq lookup, and identifier/limit validation is now strict at route boundaries.
- verification: `npm run typecheck`, `npm test` (63/63), targeted regression coverage for >1000 message history, >50 chain lists, strict limit parsing, and identifier hardening
- residuals: unread aggregation remains intentionally brute-force/in-process for MVP; no caching/invalidation was added in this spec by design.

## 002-chain-write-flows
- accepted: 2026-03-08
- outcome: write endpoints are implemented with protocol validation, summary fallback, duplicate handling, stable validation/chain/queue error mapping, and `response_from`-implies-notify persistence.
- verification: `npm run typecheck`, `npm test`, live `npm start` probes on `UMSG_PORT=18001`, direct `u-db-read` verification of stored rows
- residuals: one live append probe returned a transient `QUEUE_FAILURE` before succeeding on retry, which matches the retriable exit-code-3 model.

## 001-backend-skeleton-and-adapter-boundaries
- accepted: 2026-03-08
- outcome: Node.js + TypeScript backend skeleton landed with Fastify, `@fastify/websocket`, Vitest, a dedicated `u-db` adapter boundary, structured `501 NOT_IMPLEMENTED` placeholders, and a documented run/preflight workflow.
- verification: `npm run preflight`, `npm run typecheck`, `npm test`, `npm run build`, live HTTP and WebSocket probes on `UMSG_PORT=18000`
- residuals: default port `8000` remained configured correctly but was occupied by another local process during acceptance, so live bind validation used an alternate port.
