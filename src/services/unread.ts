import type { StoredMessage, ReadCursor } from "../lib/protocol-types.js";

/**
 * Check whether a participant is involved in a message
 * (appears in notify or response_from).
 */
function isInvolved(msg: StoredMessage, participantId: string): boolean {
  return msg.notify.includes(participantId) || msg.response_from === participantId;
}

/**
 * Count unread messages for a participant in a set of messages,
 * given their read-through cursor seq.
 */
export function countUnread(
  messages: StoredMessage[],
  participantId: string,
  readThroughSeq: number,
): number {
  let count = 0;
  for (const msg of messages) {
    if (msg.seq > readThroughSeq && isInvolved(msg, participantId)) {
      count++;
    }
  }
  return count;
}

/**
 * Build a map of chain_id -> read_through_seq from cursor rows.
 */
export function cursorMap(cursors: ReadCursor[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of cursors) {
    map.set(c.chain_id, c.read_through_seq);
  }
  return map;
}
