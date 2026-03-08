import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { FastifyInstance } from "fastify";

describe("backend skeleton", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = loadConfig();
    app = await buildApp(config);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /healthz returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  const notImplementedRoutes = [
    { method: "GET" as const, url: "/api/search" },
    { method: "GET" as const, url: "/api/sessions" },
  ];

  for (const { method, url } of notImplementedRoutes) {
    it(`${method} ${url} returns 501 with structured error`, async () => {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(501);
      const body = res.json();
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code", "NOT_IMPLEMENTED");
      expect(body).toHaveProperty("statusCode", 501);
    });
  }
});
