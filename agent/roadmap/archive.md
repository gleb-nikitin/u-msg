# Completed Specs
# Append newest first.

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
