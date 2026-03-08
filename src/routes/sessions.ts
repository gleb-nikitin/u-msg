import type { FastifyInstance } from "fastify";
import { notImplemented } from "../lib/http-errors.js";

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/sessions
  app.get("/api/sessions", async (_req, reply) => {
    const err = notImplemented("GET /api/sessions");
    return reply.status(err.statusCode).send(err.toJSON());
  });
}
