import type { FastifyInstance } from "fastify";
import { notImplemented } from "../lib/http-errors.js";

export async function inboxRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/inbox?for={participant_id}
  app.get("/api/inbox", async (_req, reply) => {
    const err = notImplemented("GET /api/inbox");
    return reply.status(err.statusCode).send(err.toJSON());
  });
}
