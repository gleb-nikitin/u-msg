# Product And Architecture

## What u-msg Is
- A chain-based messaging system for humans, agents, and services.
- A shared interaction log and memory layer with linear chains, notify/response semantics, and summary/content split.
- Protocol-first and participant-agnostic, with future compatibility planned for Claude, OpenAI, and local Ollama-backed agents.

## Core Architecture
```text
UI (Web + TUI)
    |
    v
u-msg backend
    |
    +--> u-db
    +--> provider adapter seam (post-MVP)
    +--> MCP/code index search layer
```

## What u-msg Owns
- Chain mechanics: new chain creation, append-only ordering, chain-level history.
- Protocol enforcement: required fields, type-specific validation, error mapping.
- Summary fallback when callers omit `summary`.
- Backend endpoints and WebSocket message events.
- Application-side unread aggregation over `mail` and `mail_read_cursor`.
- A provider-neutral message contract that future bridge adapters can share unchanged.

## What u-msg Does Not Own
- Generic storage internals, spooling, or locking already shipped in `u-db`.
- Human UI state and presentation decisions owned by `u-msg-ui`.
- Session lifecycle orchestration beyond the contract needed for MVP messaging.
- Search engine implementation beyond exposing/integrating the search surface.
- Provider SDK/API specifics for Claude, OpenAI, or Ollama before a later adapter phase is accepted.

## Design Rules
1. Hub is a domain-agnostic communication plane, not a task tracker.
2. Chains are strictly linear; no branching in MVP.
3. Backend stays agent-friendly; frontend stays human-friendly.
4. Participant identities are opaque strings.
5. Start minimal: core messaging first, advanced orchestration later.

## MVP Scope
- In scope: chain writes, append semantics, unread/read state, summary fallback, API endpoints, WebSocket `new_message`, and `u-db` integration.
- Out of scope: workflow logic, cleanup/delete flows, streaming partials, participant directory, provider bridge implementations, and speculative storage extensions.
