import type { FastifyInstance } from "fastify";
import { badRequest } from "../lib/http-errors.js";
import { safeIdentifier } from "../lib/safe-identifier.js";
import { listInbox } from "../services/list-inbox.js";
import type { UDbAdapter } from "../adapters/u-db.js";

export async function inboxRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/inbox?for={participant_id}&limit={N}
  app.get<{ Querystring: { for?: string; limit?: string } }>(
    "/api/inbox",
    async (req, reply) => {
      const participantId = safeIdentifier(req.query.for ?? "", "for");

      let limit: number | undefined;
      if (req.query.limit !== undefined) {
        const n = Number(req.query.limit);
        if (!Number.isInteger(n) || n < 1) {
          throw badRequest("limit must be a positive integer");
        }
        limit = n;
      }

      const udb = (app as unknown as { udb: UDbAdapter }).udb;
      const entries = await listInbox(udb, participantId, limit);
      return reply.send(entries);
    },
  );
}
