import type { FastifyInstance } from "fastify";
import type { MessagePublisher } from "../services/publish-new-message.js";

export async function streamWs(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { participant?: string } }>(
    "/ws/stream",
    { websocket: true },
    (socket, req) => {
      const raw = req.query.participant;
      const participantId = typeof raw === "string" ? raw.trim() : "";

      if (participantId.length === 0) {
        socket.send(JSON.stringify({
          type: "error",
          code: "BAD_REQUEST",
          error: "participant query parameter is required",
        }));
        socket.close();
        return;
      }

      const publisher = (app as unknown as { publisher: MessagePublisher }).publisher;
      publisher.subscribe(participantId, socket);

      socket.send(JSON.stringify({
        type: "connected",
        participant: participantId,
      }));

      socket.on("message", () => {
        // MVP: no inbound message handling needed
      });
    },
  );
}
