import type { FastifyInstance } from "fastify";
import { badRequest } from "../lib/http-errors.js";

export interface SearchResult {
  results: [];
  query: string;
  scope: string | null;
  status: "not_wired";
}

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { q?: string; project?: string } }>(
    "/api/search",
    async (req, reply) => {
      const q = req.query.q;
      if (!q || q.trim().length === 0) {
        throw badRequest("q query parameter is required and must be non-empty");
      }

      const response: SearchResult = {
        results: [],
        query: q.trim(),
        scope: req.query.project?.trim() || null,
        status: "not_wired",
      };
      return reply.send(response);
    },
  );
}
