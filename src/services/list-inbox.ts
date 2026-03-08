import type { UDbAdapter } from "../adapters/u-db.js";
import type { InboxEntry } from "../lib/protocol-types.js";
import { listChains } from "./list-chains.js";

/**
 * List inbox entries for a participant — chains with unread > 0.
 * Fetches all involved chains before filtering to avoid silent truncation.
 */
export async function listInbox(
  udb: UDbAdapter,
  participantId: string,
  limit?: number,
): Promise<InboxEntry[]> {
  // Fetch uncapped so filtering doesn't silently drop unread chains
  const all = await listChains(udb, participantId);
  const unread = all.filter(e => e.unread_count > 0);
  return limit !== undefined ? unread.slice(0, limit) : unread;
}
