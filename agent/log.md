# Action Log
# Format: YYYY-MM-DD HH:MM | category | action | result
2026-03-06 20:50 | milestone | initialized project from code template | success
2026-03-06 21:45 | policy | aligned project docs with roadmap addendum/steps and fixed external solution scope to u-db + u-msg-ui | success
2026-03-06 22:03 | milestone | near-intents split | Created roadmap/near-intents.md from global docs (project-specific excerpts, no text edits).
2026-03-06 22:06 | milestone | removed original global docs | Deleted roadmap/global.md and roadmap/global-addendum.md after moving canonical copies to u-msg-ui/human.
2026-03-06 22:08 | policy | cold-start context cleanup | Repointed docs/roadmap references from removed global docs to near-intents.md + steps.md for deterministic agent startup.
2026-03-08 10:58 | milestone | rebuilt context set from inbox donors | Added agent/docs/index.md and split canonical facts into product, protocol, integration, and roadmap docs; removed stale startup references.
2026-03-08 11:06 | policy | corrected repository identity and established clean baseline for spec execution | Replace mistaken u-mail remote with u-msg, add local artifact ignore, and publish current context as the starting mainline.
2026-03-08 11:12 | milestone | checkpointed roadmap and protocol context updates | Captured current doc and state refinements as a clean local safepoint before spec execution continues.
2026-03-08 12:24 | milestone | drafted specs 001-005 and activated spec 001 | Execution can start from the TypeScript backend skeleton while provider integrations remain deferred.
2026-03-08 12:33 | validation | planning auditor sanity-check | Approved with minor fixes; synced roadmap status and clarified queue-failure handling for spec 002.
2026-03-08 12:33 | policy | tightened executor guardrails from follow-up audit advice | Locked stack choices for spec 001, added u-db preflight/adapter assumptions, kept unread aggregation brute-force, and made realtime fan-out explicitly in-process only.
2026-03-08 12:33 | policy | clarified executor escalation path | Specs remain the primary contract, but executors may ask the user targeted questions when blocked or facing real ambiguity.
2026-03-08 12:43 | policy | added executor completion reporting to specs 002-005 | Executors must report changed files, verification results, unresolved risks, and suggested context updates when finishing a spec.
2026-03-08 12:52 | milestone | accepted spec 001 and advanced roadmap | Verified preflight, typecheck, tests, build, and live probes; archived spec 001 and activated spec 002.
2026-03-08 12:52 | policy | recorded always-on server test surface | Shared `/work/server` ingress and running `u-msg-ui` are now part of the execution context; backend/UI tests must account for stub ownership of host port 8000.
2026-03-08 13:06 | validation | spec 002 acceptance review blocked | Malformed JSON still maps to INTERNAL_ERROR and response_from->notify semantics are missing, so spec 002 remains active pending fixes.
2026-03-08 13:12 | policy | auditor launch escalation is explicit | Tell the user whenever an auditor launch is needed during spec acceptance or execution.
2026-03-08 13:14 | policy | executor handoff includes re-index | User will re-index the project with Code Indexer after each executor completion.
2026-03-08 13:16 | milestone | accepted spec 002 and advanced roadmap | Verified rebuild, typecheck, tests, live create/duplicate/append probes, malformed JSON handling, and stored row shape; archived spec 002 and activated spec 003.
2026-03-08 15:06 | validation | spec 003 acceptance review blocked | Full-history and latest-read paths are still capped, inbox inherits a silent limit, and identifier/query validation is too loose; keep spec 003 active and send a narrow fix brief without launching an auditor.
2026-03-08 15:26 | milestone | accepted spec 003 and advanced roadmap | Re-verified typecheck and tests (63/63), confirmed long-chain and strict-validation regressions are covered, archived spec 003, and activated spec 004.
