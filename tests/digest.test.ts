import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { FastifyInstance } from "fastify";
import type { StoredMessage } from "../src/lib/protocol-types.js";

let mailStore: StoredMessage[] = [];
let seqCounter = 0;

function addMsg(overrides: Partial<StoredMessage> & { chain_id: string }): StoredMessage {
  seqCounter++;
  const msg: StoredMessage = {
    ts: overrides.ts ?? new Date().toISOString(),
    producer_key: overrides.producer_key ?? `pk-${seqCounter}`,
    msg_id: overrides.msg_id ?? `msg-${seqCounter}`,
    chain_id: overrides.chain_id,
    seq: overrides.seq ?? seqCounter,
    from_id: overrides.from_id ?? "alice",
    notify: overrides.notify ?? ["bob"],
    response_from: overrides.response_from ?? null,
    type: overrides.type ?? "chat",
    event_type: overrides.event_type ?? null,
    external_ref: overrides.external_ref ?? null,
    summary: overrides.summary ?? `Message ${seqCounter}`,
    content: overrides.content ?? `Content ${seqCounter}`,
    meta: overrides.meta ?? null,
  };
  mailStore.push(msg);
  return msg;
}

vi.mock("node:child_process", () => {
  return {
    execFile: (
      cmd: string,
      args: string[],
      _opts: unknown,
      cb: (err: unknown, result: { stdout: string; stderr: string }) => void,
    ) => {
      const table = args[0];
      const isRead = cmd.includes("read");

      if (isRead && table === "msg-mail") {
        const orderIdx = args.indexOf("--order");
        const order = orderIdx >= 0 ? args[orderIdx + 1]! : "";
        const limitIdx = args.indexOf("--limit");
        const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]!, 10) : 10000;

        let filtered = [...mailStore];
        if (order.includes("ts DESC")) {
          filtered.sort((a, b) => (a.ts > b.ts ? -1 : 1));
        }

        filtered = filtered.slice(0, limit);

        const header = "ts\tproducer_key\tmsg_id\tchain_id\tseq\tfrom_id\tnotify\tresponse_from\ttype\tevent_type\texternal_ref\tsummary\tcontent\tmeta";
        const rows = filtered.map((m) =>
          [
            m.ts,
            m.producer_key,
            m.msg_id,
            m.chain_id,
            m.seq,
            m.from_id,
            JSON.stringify(m.notify),
            m.response_from ?? "",
            m.type,
            m.event_type ?? "",
            m.external_ref ?? "",
            m.summary,
            m.content,
            m.meta ? JSON.stringify(m.meta) : "null",
          ].join("\t"),
        );
        cb(null, { stdout: [header, ...rows].join("\n") + "\n", stderr: "" });
        return;
      }

      if (isRead && table === "msg-mail_read_cursor") {
        cb(null, { stdout: "updated_ts\tchain_id\tparticipant_id\tread_through_seq\n", stderr: "" });
        return;
      }

      cb(null, { stdout: "", stderr: "" });
    },
  };
});

describe("digest API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = loadConfig();
    app = await buildApp(config);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mailStore = [];
    seqCounter = 0;
  });

  it("returns summary-only digest entries sorted by ts desc", async () => {
    addMsg({
      chain_id: "c1",
      seq: 1,
      from_id: "alice",
      notify: ["bob"],
      summary: "older c1",
      content: "full older c1",
      ts: "2026-01-01T00:00:00.000Z",
      type: "chat",
    });
    addMsg({
      chain_id: "c2",
      seq: 1,
      from_id: "carol",
      notify: ["dave"],
      response_from: "bob",
      summary: "newer c2",
      content: "full newer c2",
      ts: "2026-01-01T00:02:00.000Z",
      type: "status",
    });

    const res = await app.inject({ method: "GET", url: "/api/digest?for=bob" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({
      chain_id: "c2",
      seq: 1,
      from_id: "carol",
      summary: "newer c2",
      ts: "2026-01-01T00:02:00.000Z",
      type: "status",
    });
    expect(body[1]).toEqual({
      chain_id: "c1",
      seq: 1,
      from_id: "alice",
      summary: "older c1",
      ts: "2026-01-01T00:00:00.000Z",
      type: "chat",
    });
    expect(body[0]).not.toHaveProperty("content");
    expect(body[1]).not.toHaveProperty("content");
  });

  it("filters messages using notify/response_from/from_id involvement semantics", async () => {
    addMsg({ chain_id: "c1", from_id: "bob", notify: ["x"], summary: "from bob" });
    addMsg({ chain_id: "c2", from_id: "alice", notify: ["bob"], summary: "notified bob" });
    addMsg({ chain_id: "c3", from_id: "alice", notify: ["x"], response_from: "bob", summary: "response bob" });
    addMsg({ chain_id: "c4", from_id: "alice", notify: ["x"], response_from: "y", summary: "not involved" });

    const res = await app.inject({ method: "GET", url: "/api/digest?for=bob&limit=10" });
    expect(res.statusCode).toBe(200);

    const chainIds = res.json().map((e: { chain_id: string }) => e.chain_id).sort();
    expect(chainIds).toEqual(["c1", "c2", "c3"]);
  });

  it("validates for and limit query params", async () => {
    const missingFor = await app.inject({ method: "GET", url: "/api/digest" });
    expect(missingFor.statusCode).toBe(400);

    const invalidFor = await app.inject({ method: "GET", url: "/api/digest?for=bob%00evil" });
    expect(invalidFor.statusCode).toBe(400);

    const invalidLimit = await app.inject({ method: "GET", url: "/api/digest?for=bob&limit=0" });
    expect(invalidLimit.statusCode).toBe(400);

    const invalidLimit2 = await app.inject({ method: "GET", url: "/api/digest?for=bob&limit=3.5" });
    expect(invalidLimit2.statusCode).toBe(400);
  });

  it("uses default limit 100", async () => {
    for (let i = 1; i <= 120; i++) {
      addMsg({
        chain_id: "c-default",
        seq: i,
        from_id: "alice",
        notify: ["bob"],
        summary: `msg-${i}`,
        ts: `2026-01-01T00:${String(i % 60).padStart(2, "0")}:00.000Z`,
      });
    }

    const res = await app.inject({ method: "GET", url: "/api/digest?for=bob" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(100);
  });

  it("caps limit at 500", async () => {
    for (let i = 1; i <= 600; i++) {
      addMsg({
        chain_id: "c-cap",
        seq: i,
        from_id: "alice",
        notify: ["bob"],
        summary: `cap-${i}`,
        ts: `2026-02-${String((i % 28) + 1).padStart(2, "0")}T00:00:${String(i % 60).padStart(2, "0")}.000Z`,
      });
    }

    const res = await app.inject({ method: "GET", url: "/api/digest?for=bob&limit=999" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(500);
  });
});
