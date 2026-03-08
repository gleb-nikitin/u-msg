import type { UDbAdapter } from "../adapters/u-db.js";
import type { StoredMessage, InboxEntry } from "../lib/protocol-types.js";
import { countUnread, cursorMap } from "./unread.js";

/**
 * List chains where a participant is involved (appears in notify or response_from).
 * Returns chain summaries with unread counts, ordered by latest message ts descending.
 */
export async function listChains(
  udb: UDbAdapter,
  participantId: string,
  limit?: number,
): Promise<InboxEntry[]> {
  // Brute-force: read recent mail and group by chain
  const messages = await udb.readRecentMail("ts DESC", 10000);

  // Group messages by chain_id
  const chainMessages = new Map<string, StoredMessage[]>();
  for (const msg of messages) {
    // Include chain if participant is involved in any message
    const arr = chainMessages.get(msg.chain_id);
    if (arr) {
      arr.push(msg);
    } else {
      chainMessages.set(msg.chain_id, [msg]);
    }
  }

  // Filter to chains where participant is involved
  const involvedChains = new Map<string, StoredMessage[]>();
  for (const [chainId, msgs] of chainMessages) {
    const involved = msgs.some(
      m => m.notify.includes(participantId) || m.response_from === participantId || m.from_id === participantId,
    );
    if (involved) {
      involvedChains.set(chainId, msgs);
    }
  }

  // Get cursors for this participant
  const cursors = await udb.readCursors(`participant_id='${participantId}'`);
  const cMap = cursorMap(cursors);

  // Build entries
  const entries: InboxEntry[] = [];
  for (const [chainId, msgs] of involvedChains) {
    // Sort ascending by seq for unread counting
    msgs.sort((a, b) => a.seq - b.seq);
    const latest = msgs[msgs.length - 1]!;
    const readThrough = cMap.get(chainId) ?? 0;
    const participants = new Set<string>();
    for (const msg of msgs) {
      participants.add(msg.from_id);
      for (const n of msg.notify) participants.add(n);
      if (msg.response_from) participants.add(msg.response_from);
    }

    entries.push({
      chain_id: chainId,
      participants: [...participants],
      response_from: latest.response_from,
      last_summary: latest.summary,
      last_ts: latest.ts,
      latest_ts: latest.ts,
      latest_summary: latest.summary,
      latest_from_id: latest.from_id,
      unread_count: countUnread(msgs, participantId, readThrough),
      max_seq: latest.seq,
    });
  }

  // Sort by latest_ts descending
  entries.sort((a, b) => (a.latest_ts > b.latest_ts ? -1 : 1));

  return limit !== undefined ? entries.slice(0, limit) : entries;
}
