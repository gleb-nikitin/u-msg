import type { FastifyInstance } from "fastify";
import { badRequest } from "../lib/http-errors.js";
import { safeIdentifier } from "../lib/safe-identifier.js";
import { listDigest } from "../services/digest.js";
import type { UDbAdapter } from "../adapters/u-db.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function parseDigestLimit(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw badRequest("limit must be a positive integer");
  }
  return Math.min(n, MAX_LIMIT);
}

export async function digestRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/digest?for={participant_id}&limit={N}
  app.get<{ Querystring: { for?: string; limit?: string } }>(
    "/api/digest",
    async (req, reply) => {
      const participantId = safeIdentifier(req.query.for ?? "", "for");
      const limit = parseDigestLimit(req.query.limit);
      const udb = (app as unknown as { udb: UDbAdapter }).udb;
      const entries = await listDigest(udb, participantId, limit);
      return reply.send(entries);
    },
  );
}
