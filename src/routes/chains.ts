import type { FastifyInstance } from "fastify";
import { notImplemented, badRequest } from "../lib/http-errors.js";
import { validateMessage } from "../lib/validate-message.js";
import { writeMessage } from "../services/write-message.js";
import type { UDbAdapter } from "../adapters/u-db.js";

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

  // POST /api/chains — create new chain
  app.post("/api/chains", async (req, reply) => {
    const participantId = req.headers["x-participant-id"];
    if (!participantId || typeof participantId !== "string") {
      throw badRequest("X-Participant-Id header is required");
    }

    const validated = validateMessage(req.body);
    const udb = (app as unknown as { udb: UDbAdapter }).udb;
    const result = await writeMessage(udb, validated);
    return reply.status(201).send(result);
  });

  // POST /api/chains/:chain_id/messages — append to existing chain
  app.post<{ Params: { chain_id: string } }>(
    "/api/chains/:chain_id/messages",
    async (req, reply) => {
      const participantId = req.headers["x-participant-id"];
      if (!participantId || typeof participantId !== "string") {
        throw badRequest("X-Participant-Id header is required");
      }

      const validated = validateMessage(req.body);
      const udb = (app as unknown as { udb: UDbAdapter }).udb;
      const result = await writeMessage(udb, validated, req.params.chain_id);
      return reply.status(201).send(result);
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
