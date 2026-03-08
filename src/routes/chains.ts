import type { FastifyInstance } from "fastify";
import { notImplemented } from "../lib/http-errors.js";

export async function chainRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/chains?participant={id}&limit={N}
  app.get("/api/chains", async (_req, reply) => {
    const err = notImplemented("GET /api/chains");
    return reply.status(err.statusCode).send(err.toJSON());
  });

  // GET /api/chains/:chain_id/messages
  app.get<{ Params: { chain_id: string } }>(
    "/api/chains/:chain_id/messages",
    async (_req, reply) => {
      const err = notImplemented("GET /api/chains/:chain_id/messages");
      return reply.status(err.statusCode).send(err.toJSON());
    },
  );

  // POST /api/chains
  app.post("/api/chains", async (_req, reply) => {
    const err = notImplemented("POST /api/chains");
    return reply.status(err.statusCode).send(err.toJSON());
  });

  // POST /api/chains/:chain_id/messages
  app.post<{ Params: { chain_id: string } }>(
    "/api/chains/:chain_id/messages",
    async (_req, reply) => {
      const err = notImplemented("POST /api/chains/:chain_id/messages");
      return reply.status(err.statusCode).send(err.toJSON());
    },
  );

  // POST /api/chains/:chain_id/read
  app.post<{ Params: { chain_id: string } }>(
    "/api/chains/:chain_id/read",
    async (_req, reply) => {
      const err = notImplemented("POST /api/chains/:chain_id/read");
      return reply.status(err.statusCode).send(err.toJSON());
    },
  );
}
