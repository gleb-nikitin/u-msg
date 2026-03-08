import type { UDbAdapter } from "../adapters/u-db.js";
import { badRequest } from "../lib/http-errors.js";

/**
 * Mark a chain as read for a participant.
 * If `through` is provided, marks through that seq; otherwise marks through the latest seq.
 * Reads current cursor to decide write vs update (no upsert in u-db).
 */
export async function markRead(
  udb: UDbAdapter,
  chainId: string,
  participantId: string,
  through?: number,
): Promise<void> {
  // Determine the target seq
  let targetSeq: number;
  if (through !== undefined) {
    targetSeq = through;
  } else {
    // Use targeted DESC LIMIT 1 query instead of reading full history
    targetSeq = await udb.readMaxSeq(chainId);
    if (targetSeq === 0) {
      throw badRequest("Chain has no messages");
    }
  }

  // Read existing cursor for this participant + chain
  const cursors = await udb.readCursors(
    `chain_id='${chainId}' AND participant_id='${participantId}'`,
    1,
  );

  if (cursors.length > 0) {
    // Only update if new seq is actually higher
    if (targetSeq > cursors[0]!.read_through_seq) {
      await udb.updateCursor(chainId, participantId, targetSeq);
    }
  } else {
    await udb.writeCursor(chainId, participantId, targetSeq);
  }
}
