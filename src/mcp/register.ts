import type { FastifyInstance } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { UDbAdapter } from "../adapters/u-db.js";
import type { MessagePublisher } from "../services/publish-new-message.js";
import { createMcpServer } from "./server.js";

export async function mcpRoutes(app: FastifyInstance): Promise<void> {
  const udb = (app as unknown as { udb: UDbAdapter }).udb;
  const publisher = (app as unknown as { publisher: MessagePublisher }).publisher;

  app.post("/mcp", async (request, reply) => {
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    });
    const server = createMcpServer(udb, publisher);

    reply.hijack();
    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } finally {
      await server.close();
    }
  });
}
