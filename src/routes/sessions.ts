import type { FastifyInstance } from "fastify";

export interface SessionListResponse {
  sessions: [];
  status: "not_wired";
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/sessions", async (_req, reply) => {
    const response: SessionListResponse = {
      sessions: [],
      status: "not_wired",
    };
    return reply.send(response);
  });
}
