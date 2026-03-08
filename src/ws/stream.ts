import type { FastifyInstance } from "fastify";

export async function streamWs(app: FastifyInstance): Promise<void> {
  app.get("/ws/stream", { websocket: true }, (socket, _req) => {
    socket.send(JSON.stringify({
      type: "connected",
      message: "WebSocket connected. Realtime events not yet implemented.",
    }));

    socket.on("message", (data: Buffer | string) => {
      // MVP: echo back a structured not-implemented response
      const raw = typeof data === "string" ? data : data.toString();
      socket.send(JSON.stringify({
        type: "error",
        code: "NOT_IMPLEMENTED",
        error: "Realtime event handling is not yet implemented",
        received: raw,
      }));
    });
  });
}
