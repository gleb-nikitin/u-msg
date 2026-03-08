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

  it("GET /api/search returns temporary not_wired response", async () => {
    const res = await app.inject({ method: "GET", url: "/api/search?q=hello" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({
      results: [],
      query: "hello",
      scope: null,
      status: "not_wired",
    });
  });

  it("GET /api/search with project scope echoes scope", async () => {
    const res = await app.inject({ method: "GET", url: "/api/search?q=test&project=myproj" });
    expect(res.statusCode).toBe(200);
    expect(res.json().scope).toBe("myproj");
  });

  it("GET /api/search without q returns 400", async () => {
    const res = await app.inject({ method: "GET", url: "/api/search" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty("code", "BAD_REQUEST");
  });

  it("GET /api/sessions returns temporary not_wired response", async () => {
    const res = await app.inject({ method: "GET", url: "/api/sessions" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      sessions: [],
      status: "not_wired",
    });
  });
});
