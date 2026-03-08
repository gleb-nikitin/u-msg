import type { WebSocket } from "ws";
import type { NewMessageEvent, WriteResult } from "../lib/protocol-types.js";

/**
 * In-process connection registry and fan-out for realtime new_message events.
 * No broker, no durable delivery — push directly to connected sockets.
 */
export class MessagePublisher {
  /** participant_id → set of connected sockets */
  private subs = new Map<string, Set<WebSocket>>();

  /** Register a participant's WebSocket connection. */
  subscribe(participantId: string, socket: WebSocket): void {
    let set = this.subs.get(participantId);
    if (!set) {
      set = new Set();
      this.subs.set(participantId, set);
    }
    set.add(socket);

    socket.on("close", () => {
      set!.delete(socket);
      if (set!.size === 0) {
        this.subs.delete(participantId);
      }
    });
  }

  /**
   * Fan out a new_message event to all connected participants in the notify list.
   * Failures are silently ignored — storage is the source of truth.
   */
  publish(
    notify: string[],
    result: WriteResult,
    summary: string,
    fromId: string,
  ): void {
    const event: NewMessageEvent = {
      type: "new_message",
      chain_id: result.chain_id,
      seq: result.seq,
      summary,
      from_id: fromId,
    };
    const payload = JSON.stringify(event);

    const unique = new Set(notify);
    for (const participantId of unique) {
      const sockets = this.subs.get(participantId);
      if (!sockets) continue;
      for (const socket of sockets) {
        try {
          socket.send(payload);
        } catch {
          // Delivery failure must not affect the write path
        }
      }
    }
  }

  /** Number of participants with at least one active connection. */
  get subscriberCount(): number {
    return this.subs.size;
  }

  /** Number of active sockets for a participant. */
  connectionCount(participantId: string): number {
    return this.subs.get(participantId)?.size ?? 0;
  }
}
