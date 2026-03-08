import type { FastifyInstance } from "fastify";
import { notImplemented } from "../lib/http-errors.js";

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/search?q={query}&project={project?}
  app.get("/api/search", async (_req, reply) => {
    const err = notImplemented("GET /api/search");
    return reply.status(err.statusCode).send(err.toJSON());
  });
}
