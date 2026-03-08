import type { FastifyInstance } from "fastify";
import { badRequest } from "../lib/http-errors.js";
import { safeIdentifier } from "../lib/safe-identifier.js";
import { validateMessage } from "../lib/validate-message.js";
import { writeMessage } from "../services/write-message.js";
import { readMessageHistory } from "../services/read-message-history.js";
import { listChains } from "../services/list-chains.js";
import { markRead } from "../services/mark-read.js";
import type { UDbAdapter } from "../adapters/u-db.js";

function getUdb(app: FastifyInstance): UDbAdapter {
  return (app as unknown as { udb: UDbAdapter }).udb;
}

function parseOptionalLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw badRequest("limit must be a positive integer");
  }
  return n;
}

export async function chainRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/chains?participant={id}&limit={N}
  app.get<{ Querystring: { participant?: string; limit?: string } }>(
    "/api/chains",
    async (req, reply) => {
      const participantId = safeIdentifier(
        req.query.participant ?? "",
        "participant",
      );
      const limit = parseOptionalLimit(req.query.limit);

      const udb = getUdb(app);
      const entries = await listChains(udb, participantId, limit);
      return reply.send(entries);
    },
  );

  // GET /api/chains/:chain_id/messages
  app.get<{ Params: { chain_id: string }; Querystring: { limit?: string } }>(
    "/api/chains/:chain_id/messages",
    async (req, reply) => {
      const chainId = safeIdentifier(req.params.chain_id, "chain_id");
      const limit = parseOptionalLimit(req.query.limit);
      const udb = getUdb(app);
      const messages = await readMessageHistory(udb, chainId, limit);
      return reply.send(messages);
    },
  );

  // POST /api/chains — create new chain
  app.post("/api/chains", async (req, reply) => {
    const participantId = req.headers["x-participant-id"];
    if (!participantId || typeof participantId !== "string") {
      throw badRequest("X-Participant-Id header is required");
    }

    const validated = validateMessage(req.body);
    const udb = getUdb(app);
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

      const chainId = safeIdentifier(req.params.chain_id, "chain_id");
      const validated = validateMessage(req.body);
      const udb = getUdb(app);
      const result = await writeMessage(udb, validated, chainId);
      return reply.status(201).send(result);
    },
  );

  // POST /api/chains/:chain_id/read
  app.post<{ Params: { chain_id: string } }>(
    "/api/chains/:chain_id/read",
    async (req, reply) => {
      const chainId = safeIdentifier(req.params.chain_id, "chain_id");

      const body = req.body as { participant?: unknown; through?: unknown } | null;
      if (!body || typeof body !== "object") {
        throw badRequest("Request body must be a JSON object");
      }
      if (typeof body.participant !== "string" || body.participant.length === 0) {
        throw badRequest("participant is required and must be a non-empty string");
      }
      const participant = safeIdentifier(body.participant, "participant");

      let through: number | undefined;
      if (body.through !== undefined && body.through !== null) {
        if (typeof body.through !== "number" || !Number.isInteger(body.through) || body.through < 1) {
          throw badRequest("through must be a positive integer when provided");
        }
        through = body.through;
      }

      const udb = getUdb(app);
      await markRead(udb, chainId, participant, through);
      return reply.status(204).send();
    },
  );
}
