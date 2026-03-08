import type { UDbAdapter } from "../adapters/u-db.js";
import type { StoredMessage } from "../lib/protocol-types.js";

/**
 * Read full chain history in ascending seq order.
 * When limit is provided, returns at most that many messages.
 * When omitted, returns all messages (uncapped).
 */
export async function readMessageHistory(
  udb: UDbAdapter,
  chainId: string,
  limit?: number,
): Promise<StoredMessage[]> {
  return udb.readMail(`chain_id='${chainId}'`, "seq ASC", limit);
}
