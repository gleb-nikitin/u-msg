# Spec 005: Search, Session Surfaces, And Operational Validation

## Goal
Finish the MVP backend surface by defining the temporary search/session behavior and adding operational checks that validate the complete post-Spec-004 backend against the frozen contracts.

## Context
- Depends on Specs `001` through `004`.
- Search and session endpoints exist in the UI contract, but no local implementation path is committed yet.
- Provider adapters remain out of scope, so session behavior here must not imply Claude/OpenAI/Ollama runtime ownership.

## Deliverables
| File | Action |
|------|--------|
| `src/routes/search.ts` | Modify |
| `src/routes/sessions.ts` | Modify |
| `agent/scripts/check-mvp.sh` | Create |
| `agent/docs/run.md` | Modify |
| `agent/docs/kb.md` | Modify |

## Interface
- `GET /api/search?q={query}&project={project?}`
- `GET /api/sessions`

## Behavior
1. Make both endpoints explicit and deterministic rather than leaving them absent.
2. If full implementation is still deferred, return one stable temporary behavior that is documented for the UI and future executors.
3. Keep session responses provider-neutral and avoid implying a provider bridge exists before it does.
4. Add an operational validation script that checks the MVP endpoints, WebSocket delivery, and expected local infra assumptions.
5. Record remaining search/session follow-up in the KB rather than scattering notes across startup docs.

## Constraints
- Do not implement provider adapters in this spec.
- Do not invent a permanent session model without an accepted follow-up spec.
- Do not let temporary search/session behavior silently diverge from the documented contract.

## Acceptance Criteria
- [ ] 1. `GET /api/search` and `GET /api/sessions` exist with documented, deterministic behavior.
- [ ] 2. The temporary behavior is explicit enough that UI work and later backend work can proceed without guessing.
- [ ] 3. An operational validation script exists and covers the complete MVP backend surface after Specs `001` through `004`.
- [ ] 4. KB handoff notes capture unresolved follow-up for real search/session implementation.

## Verification
- `npm run typecheck`
- `npm test`
- `./agent/scripts/check-mvp.sh`
- Manual check that all documented HTTP routes and `WS /ws/stream` behave as specified after the full MVP slice lands.

## Completion Report
When the executor considers this spec complete, they must report:
- changed files
- verification results
- unresolved risks or blockers
- suggested context or handoff updates
