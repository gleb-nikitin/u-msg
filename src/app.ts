import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { Config } from "./config.js";
import { HttpError } from "./lib/http-errors.js";
import { UDbAdapter } from "./adapters/u-db.js";
import { healthRoutes } from "./routes/health.js";
import { chainRoutes } from "./routes/chains.js";
import { inboxRoutes } from "./routes/inbox.js";
import { searchRoutes } from "./routes/search.js";
import { sessionRoutes } from "./routes/sessions.js";
import { streamWs } from "./ws/stream.js";

export async function buildApp(config: Config) {
  const app = Fastify({ logger: true });

  // Decorate with shared adapter
  const udb = new UDbAdapter(config);
  app.decorate("udb", udb);

  // WebSocket support
  await app.register(websocket);

  // Error handler: structured JSON for all errors
  app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: error.message,
      code: "INTERNAL_ERROR",
      statusCode,
    });
  });

  // Register routes
  await app.register(healthRoutes);
  await app.register(chainRoutes);
  await app.register(inboxRoutes);
  await app.register(searchRoutes);
  await app.register(sessionRoutes);
  await app.register(streamWs);

  return app;
}
