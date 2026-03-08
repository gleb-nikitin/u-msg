import type { UDbAdapter } from "../adapters/u-db.js";
import type { WriteResult } from "../lib/protocol-types.js";
import type { ValidatedMessage } from "../lib/validate-message.js";
import { generateSummary } from "../lib/summary.js";
import type { MessagePublisher } from "./publish-new-message.js";

/**
 * Write a new message to a chain (new or existing).
 * Handles summary fallback, builds u-db column/value arrays,
 * and publishes new_message events to subscribed participants.
 */
export async function writeMessage(
  udb: UDbAdapter,
  msg: ValidatedMessage,
  chainId?: string,
  publisher?: MessagePublisher,
): Promise<WriteResult> {
  const summary = msg.summary ?? generateSummary(msg.content);

  // response_from implies notification even if omitted from notify
  let notify = msg.notify;
  if (msg.response_from !== null && !notify.includes(msg.response_from)) {
    notify = [...notify, msg.response_from];
  }

  const cols: string[] = [
    "producer_key",
    "from_id",
    "notify",
    "type",
    "content",
    "summary",
  ];
  const vals: unknown[] = [
    msg.producer_key,
    msg.from_id,
    JSON.stringify(notify),
    msg.type,
    msg.content,
    summary,
  ];

  if (chainId) {
    cols.push("chain_id");
    vals.push(chainId);
  }

  if (msg.response_from !== null) {
    cols.push("response_from");
    vals.push(msg.response_from);
  }

  if (msg.event_type !== null) {
    cols.push("event_type");
    vals.push(msg.event_type);
  }

  if (msg.external_ref !== null) {
    cols.push("external_ref");
    vals.push(msg.external_ref);
  }

  if (msg.meta !== null) {
    cols.push("meta");
    vals.push(JSON.stringify(msg.meta));
  }

  const result = await udb.writeMail(cols, vals);

  // Fan out new_message event to subscribed participants (fire-and-forget)
  if (publisher) {
    try {
      publisher.publish(notify, result, summary, msg.from_id);
    } catch {
      // WebSocket delivery failure must not break the write path
    }
  }

  return {
    msg_id: result.msg_id,
    chain_id: result.chain_id,
    seq: result.seq,
  };
}
