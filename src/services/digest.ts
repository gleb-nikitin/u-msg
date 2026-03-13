import type { UDbAdapter } from "../adapters/u-db.js";
import type { DigestEntry } from "../lib/protocol-types.js";

const MAX_SCAN_MESSAGES = 10_000;

export async function listDigest(
  udb: UDbAdapter,
  participantId: string,
  limit: number,
): Promise<DigestEntry[]> {
  const messages = await udb.readRecentMail("ts DESC", MAX_SCAN_MESSAGES);

  const entries = messages
    .filter(
      (m) => m.notify.includes(participantId) || m.response_from === participantId || m.from_id === participantId,
    )
    .map((m) => ({
      chain_id: m.chain_id,
      seq: m.seq,
      from_id: m.from_id,
      summary: m.summary,
      ts: m.ts,
      type: m.type,
    }));

  entries.sort((a, b) => (a.ts > b.ts ? -1 : 1));
  return entries.slice(0, limit);
}
