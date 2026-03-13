# Small Fixes

Append-only stream for small protocol-safe fixes.

Rules:
- Append new entries only; do not rewrite old entries.
- Keep fixes within existing protocol/spec boundaries.
- If scope grows (contract/API/schema/large cross-module change), close this spec and open a dedicated new spec.

Entries:
- 2026-03-09 | OPEN | Created small-fixes stream spec.
- 2026-03-09 | DONE | Fixed multiline/irregular mail-row parsing in adapter so `GET /api/chains` no longer fails with column-count errors on LLM-shaped content (commit `dd250c0`).
- 2026-03-09 | DONE | Forced explicit `--limit` defaults in adapter read paths (`readMail`, `readRecentMail`) to avoid implicit `u-db-read` truncation.
- 2026-03-09 | DONE | Added promise-chain mutex to `UDbAdapter.exec()` to serialize u-db child process spawns. Fixes 503 (QUEUE_FAILURE) under concurrent load from u-llm + u-msg-ui.
