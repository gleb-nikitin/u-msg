# OpenAI Adapter Direction

Use this note when future work needs the OpenAI-side equivalent of the Claude SDK/session bridge.

## Short Answer
- Primary OpenAI path: `Responses API` with `Conversations API` or `previous_response_id` for state.
- Fallback if later work needs more OpenAI-native orchestration: `Agents SDK`.

This is an inference from the official docs, not a single explicit OpenAI statement. The closest OpenAI equivalent to a Claude-style session bridge is split across `Responses`/`Conversations` for backend state and `Agents SDK` for higher-level agent-loop features.

## Why This Matches `u-msg`
- OpenAI positions the Responses API as the recommended primitive for agent-like apps and multi-turn interactions.
  Source: [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- For state, OpenAI documents two backend options:
  - durable conversations via the `Conversations API`
  - lightweight chaining via `previous_response_id`
  Source: [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- Streaming is typed and event-driven, which fits a protocol-first adapter.
  Source: [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses)
- Tool use is first-class, including built-in tools, function calling, and remote MCP.
  Source: [Using tools](https://developers.openai.com/api/docs/guides/tools)
- Async/background execution exists through `background=true`.
  Source: [Background mode](https://developers.openai.com/api/docs/guides/background)

## Why Other Options Are Worse Fits
- `Agents SDK` is the closest SDK analogue because it adds sessions, handoffs, MCP integration, and HITL resume, but it is a higher-level orchestration layer rather than the cleanest provider-neutral adapter surface.
  Sources:
  - [Agents SDK overview](https://openai.github.io/openai-agents-python/)
  - [Sessions](https://openai.github.io/openai-agents-python/sessions/)
  - [Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- `Realtime API` is stateful and tool-capable, but the docs frame it around low-latency speech/audio sessions. It is a weaker fit for a normal backend message bridge.
  Sources:
  - [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
  - [Webhooks and server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)
- `Apps SDK` is for extending ChatGPT with MCP tools and UI, not for a generic backend adapter.
  Sources:
  - [Apps SDK](https://developers.openai.com/apps-sdk/)
  - [Quickstart](https://developers.openai.com/apps-sdk/quickstart/)
- `Codex` surfaces are coding-agent specific, not a general session/message bridge.
  Source: [GPT-5.3-Codex](https://developers.openai.com/api/docs/models/gpt-5.3-codex)

## Capabilities To Care About
- Conversation state:
  - `conversation` for durable shared threads
  - `previous_response_id` for lighter turn chaining
  Source: [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- Streaming:
  - typed semantic events in `Responses`
  - background runs can also stream with resume semantics
  Sources:
  - [Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses)
  - [Background mode](https://developers.openai.com/api/docs/guides/background)
- Tool calling:
  - built-in tools, function calling, remote MCP
  - tool calls and tool outputs are distinct items linked by `call_id`
  Sources:
  - [Using tools](https://developers.openai.com/api/docs/guides/tools)
  - [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- Handoffs and multi-agent:
  - documented in `Agents SDK`, not in core `Responses` docs
  Source: [Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- Background and async work:
  - official via `background=true`
  Source: [Background mode](https://developers.openai.com/api/docs/guides/background)
- Model support:
  - verify per model; documented examples include GPT-5 and GPT-5 mini support for streaming, function calling, and MCP in Responses
  Sources:
  - [GPT-5](https://developers.openai.com/api/docs/models/gpt-5)
  - [GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini)

## Gaps And Constraints
- OpenAI docs do not present one single product that exactly equals a Claude-style session bridge.
- Core `Responses API` docs do not document first-class handoffs or multi-agent orchestration; that is documented in `Agents SDK`.
- Background mode is not a generic durable agent runtime:
  - it requires `store=true`
  - it is not ZDR-compatible
  - resumed background stream consumption in SDKs was documented as still coming at the time of research
  Source: [Background mode](https://developers.openai.com/api/docs/guides/background)
- In `Agents SDK`, session memory cannot be combined with `conversation_id` or `previous_response_id` in the same run.
  Sources:
  - [Sessions](https://openai.github.io/openai-agents-python/sessions/)
  - [Running agents](https://openai.github.io/openai-agents-python/running_agents/)

## `u-msg` Design Guidance
- Do not model `u-msg` around OpenAI sessions.
- Keep `chain_id`, `seq`, `producer_key`, unread state, and canonical history as `u-msg` concerns.
- Store OpenAI-specific state such as `conversation` or `previous_response_id` inside adapter metadata.
- Map `Responses` streaming events and tool items into `u-msg` message/event types.
- Reach for `Agents SDK` only if later work explicitly needs OpenAI-native handoffs, pause/resume, or heavier orchestration.

## Final Recommendation
For post-MVP OpenAI integration, use `Responses API` as the default adapter surface, with `Conversations API` or `previous_response_id` for state and `Responses` streaming/tool events mapped into the `u-msg` protocol.

Keep `Agents SDK` as an optional later adapter if OpenAI-native orchestration becomes worth the added coupling.
