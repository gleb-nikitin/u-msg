/** Message types allowed by the protocol. */
export type MessageType = "chat" | "event" | "status" | "error";

/** A message as stored and returned by the backend. */
export interface StoredMessage {
  ts: string;
  producer_key: string;
  msg_id: string;
  chain_id: string;
  seq: number;
  from_id: string;
  notify: string[];
  response_from: string | null;
  type: MessageType;
  event_type: string | null;
  external_ref: string | null;
  summary: string;
  content: string;
  meta: unknown | null;
}

/** Payload for creating a new chain. */
export interface NewChainRequest {
  producer_key?: string;
  from_id?: string;
  notify: string[];
  response_from?: string | null;
  type: MessageType;
  event_type?: string | null;
  external_ref?: string | null;
  summary?: string;
  content: string;
  meta?: unknown | null;
}

/** Payload for sending a message to an existing chain. */
export interface SendMessageRequest extends NewChainRequest {
  chain_id: string;
}

/** Write result returned by the backend. */
export interface WriteResult {
  msg_id: string;
  chain_id: string;
  seq: number;
}

/** Read cursor state for a participant in a chain. */
export interface ReadCursor {
  chain_id: string;
  participant_id: string;
  read_through_seq: number;
}

/** Mark-read request body. */
export interface MarkReadRequest {
  participant: string;
  through?: number;
}

/** Inbox entry for a chain with unread info. */
export interface InboxEntry {
  chain_id: string;
  participants: string[];
  response_from: string | null;
  last_summary: string;
  last_ts: string;
  latest_ts: string;
  latest_summary: string;
  latest_from_id: string;
  unread_count: number;
  max_seq: number;
}

/** Digest entry for per-message summary scanning across chains. */
export interface DigestEntry {
  chain_id: string;
  seq: number;
  from_id: string;
  summary: string;
  ts: string;
  type: MessageType;
}

/** Digest response payload returned by GET /api/digest. */
export type DigestResponse = DigestEntry[];

/** WebSocket event for new messages. */
export interface NewMessageEvent {
  type: "new_message";
  chain_id: string;
  seq: number;
  summary: string;
  from_id: string;
}

/** Generate a v0 summary from content when sender omits summary. */
export function defaultSummary(content: string): string {
  const stripped = content.replace(/[#*_~`>\[\]()!|-]/g, "").trim();
  if (stripped.length <= 200) return stripped;
  return stripped.slice(0, 200) + "...";
}
