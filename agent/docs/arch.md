# Architecture

Canonical architecture detail lives in `./agent/docs/product.md` and `./agent/docs/integration.md`.

## System Shape
- `u-msg` is the thin messaging layer between UI clients and shared storage.
- `u-msg` owns chain mechanics, protocol enforcement, summary fallback, unread semantics, and transport endpoints.
- `u-db` owns durable storage behavior and shipped write/read/update commands.
- `u-msg-ui` owns human-facing presentation and expects a fixed backend contract.

## Boundaries
- Do not move generic DB behavior into `u-msg`.
- Do not move UI state or presentation logic into `u-msg`.
- Keep participant identities opaque and routing identity-agnostic.

## Load Next
- `./agent/docs/index.md`
- `./agent/docs/product.md`
- `./agent/docs/integration.md`
