import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { FastifyInstance } from "fastify";
import type { StoredMessage, ReadCursor } from "../src/lib/protocol-types.js";

// In-memory stores
let mailStore: StoredMessage[] = [];
let cursorStore: ReadCursor[] = [];
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

// Mock child_process for write operations (POST /api/chains needs it)
vi.mock("node:child_process", () => {
  return {
    execFile: (
      cmd: string,
      args: string[],
      _opts: unknown,
      cb: (err: unknown, result: { stdout: string; stderr: string }) => void,
    ) => {
      const table = args[0];
      const isWrite = cmd.includes("write");
      const isUpdate = cmd.includes("update");

      if (isWrite && table === "msg-mail") {
        const colsIdx = args.indexOf("--cols");
        const cols = colsIdx >= 0 ? args[colsIdx + 1]!.split(",") : [];
        const valsIdx = args.indexOf("--vals");
        const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];

        seqCounter++;
        const chainIdIdx = cols.indexOf("chain_id");
        const chainId = chainIdIdx >= 0 ? String(vals[chainIdIdx]) : `chain-auto-${seqCounter}`;
        const msgId = `${chainId}_${seqCounter}`;

        const fromIdx = cols.indexOf("from_id");
        const notifyIdx = cols.indexOf("notify");
        const typeIdx = cols.indexOf("type");
        const summaryIdx = cols.indexOf("summary");
        const contentIdx = cols.indexOf("content");
        const rfIdx = cols.indexOf("response_from");

        const msg: StoredMessage = {
          ts: new Date().toISOString(),
          producer_key: cols.indexOf("producer_key") >= 0 ? String(vals[cols.indexOf("producer_key")]) : "",
          msg_id: msgId,
          chain_id: chainId,
          seq: seqCounter,
          from_id: fromIdx >= 0 ? String(vals[fromIdx]) : "",
          notify: notifyIdx >= 0 ? JSON.parse(String(vals[notifyIdx])) : [],
          response_from: rfIdx >= 0 ? String(vals[rfIdx]) : null,
          type: (typeIdx >= 0 ? String(vals[typeIdx]) : "chat") as StoredMessage["type"],
          event_type: null,
          external_ref: null,
          summary: summaryIdx >= 0 ? String(vals[summaryIdx]) : "",
          content: contentIdx >= 0 ? String(vals[contentIdx]) : "",
          meta: null,
        };
        mailStore.push(msg);

        cb(null, { stdout: `ok\t${msgId}\t${chainId}\t${seqCounter}\n`, stderr: "" });
        return;
      }

      if (isWrite && table === "msg-mail_read_cursor") {
        const colsIdx = args.indexOf("--cols");
        const cols = colsIdx >= 0 ? args[colsIdx + 1]!.split(",") : [];
        const valsIdx = args.indexOf("--vals");
        const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];

        const chainIdIdx = cols.indexOf("chain_id");
        const partIdx = cols.indexOf("participant_id");
        const seqIdx = cols.indexOf("read_through_seq");

        cursorStore.push({
          chain_id: chainIdIdx >= 0 ? String(vals[chainIdIdx]) : "",
          participant_id: partIdx >= 0 ? String(vals[partIdx]) : "",
          read_through_seq: seqIdx >= 0 ? Number(vals[seqIdx]) : 0,
        });
        cb(null, { stdout: "ok\n", stderr: "" });
        return;
      }

      if (isUpdate && table === "msg-mail_read_cursor") {
        const colsIdx = args.indexOf("--cols");
        const cols = colsIdx >= 0 ? args[colsIdx + 1]!.split(",") : [];
        const valsIdx = args.indexOf("--vals");
        const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];
        const whereIdx = args.indexOf("--where");
        const where = whereIdx >= 0 ? args[whereIdx + 1]! : "";

        for (const cursor of cursorStore) {
          const match = matchWhere(where, cursor);
          if (match) {
            const seqIdx = cols.indexOf("read_through_seq");
            if (seqIdx >= 0) cursor.read_through_seq = Number(vals[seqIdx]);
          }
        }
        cb(null, { stdout: "ok\n", stderr: "" });
        return;
      }

      // Read operations
      if (!isWrite && !isUpdate) {
        if (table === "msg-mail") {
          const whereIdx = args.indexOf("--where");
          const where = whereIdx >= 0 ? args[whereIdx + 1]! : "";
          const orderIdx = args.indexOf("--order");
          const order = orderIdx >= 0 ? args[orderIdx + 1]! : "";
          const limitIdx = args.indexOf("--limit");
          const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]!, 10) : 10000;

          let filtered = where
            ? mailStore.filter(m => matchWhereMsg(where, m))
            : [...mailStore];

          if (order.includes("seq ASC")) {
            filtered.sort((a, b) => a.seq - b.seq);
          } else if (order.includes("seq DESC")) {
            filtered.sort((a, b) => b.seq - a.seq);
          } else if (order.includes("ts DESC")) {
            filtered.sort((a, b) => (a.ts > b.ts ? -1 : 1));
          }

          filtered = filtered.slice(0, limit);
          const header = "ts\tproducer_key\tmsg_id\tchain_id\tseq\tfrom_id\tnotify\tresponse_from\ttype\tevent_type\texternal_ref\tsummary\tcontent\tmeta";
          const rows = filtered.map(m =>
            [m.ts, m.producer_key, m.msg_id, m.chain_id, m.seq, m.from_id,
             JSON.stringify(m.notify), m.response_from ?? "", m.type,
             m.event_type ?? "", m.external_ref ?? "", m.summary, m.content,
             m.meta ? JSON.stringify(m.meta) : "null"].join("\t"),
          );
          cb(null, { stdout: [header, ...rows].join("\n") + "\n", stderr: "" });
          return;
        }

        if (table === "msg-mail_read_cursor") {
          const whereIdx = args.indexOf("--where");
          const where = whereIdx >= 0 ? args[whereIdx + 1]! : "";
          const limitIdx = args.indexOf("--limit");
          const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]!, 10) : 10000;

          let filtered = where
            ? cursorStore.filter(c => matchWhere(where, c))
            : [...cursorStore];
          filtered = filtered.slice(0, limit);

          const header = "updated_ts\tchain_id\tparticipant_id\tread_through_seq";
          const rows = filtered.map(c =>
            [new Date().toISOString(), c.chain_id, c.participant_id, c.read_through_seq].join("\t"),
          );
          cb(null, { stdout: [header, ...rows].join("\n") + "\n", stderr: "" });
          return;
        }
      }

      cb(null, { stdout: "", stderr: "" });
    },
  };
});

function matchWhereMsg(where: string, msg: StoredMessage): boolean {
  const conditions = where.split(" AND ").map(c => c.trim());
  for (const cond of conditions) {
    const match = cond.match(/^(\w+)='([^']*)'$/);
    if (!match) continue;
    const [, col, val] = match;
    if (col === "chain_id" && msg.chain_id !== val) return false;
    if (col === "from_id" && msg.from_id !== val) return false;
  }
  return true;
}

function matchWhere(where: string, obj: Record<string, unknown>): boolean {
  const conditions = where.split(" AND ").map(c => c.trim());
  for (const cond of conditions) {
    const match = cond.match(/^(\w+)='([^']*)'$/);
    if (!match) continue;
    const [, col, val] = match;
    if (String(obj[col!]) !== val) return false;
  }
  return true;
}

const HEADERS = { "x-participant-id": "alice", "content-type": "application/json" };

describe("read-state flows", () => {
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
    cursorStore = [];
    seqCounter = 0;
  });

  // --- AC 1: GET /api/chains/:chain_id/messages returns ordered history ---
  describe("GET /api/chains/:chain_id/messages", () => {
    it("returns full ordered chain history", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", summary: "First", ts: "2026-01-01T00:00:00Z" });
      addMsg({ chain_id: "c1", seq: 2, from_id: "bob", summary: "Second", ts: "2026-01-01T00:01:00Z" });
      addMsg({ chain_id: "c2", seq: 1, from_id: "carol", summary: "Other chain" });

      const res = await app.inject({ method: "GET", url: "/api/chains/c1/messages" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(2);
      expect(body[0].seq).toBe(1);
      expect(body[1].seq).toBe(2);
      expect(body[0].summary).toBe("First");
      expect(body[1].summary).toBe("Second");
    });

    it("returns empty array for unknown chain", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains/nonexistent/messages" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  // --- AC 2: GET /api/chains and GET /api/inbox return correct unread counts ---
  describe("GET /api/chains", () => {
    it("requires participant query parameter", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains" });
      expect(res.statusCode).toBe(400);
    });

    it("returns chains with unread counts", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:00:00Z" });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:01:00Z" });
      addMsg({ chain_id: "c1", seq: 3, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:02:00Z" });

      // Bob has read through seq 1
      cursorStore.push({ chain_id: "c1", participant_id: "bob", read_through_seq: 1 });

      const res = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].chain_id).toBe("c1");
      expect(body[0].participants).toEqual(["alice", "bob"]);
      expect(body[0].response_from).toBeNull();
      expect(body[0].last_summary).toBe("Message 3");
      expect(body[0].last_ts).toBe("2026-01-01T00:02:00Z");
      expect(body[0].latest_summary).toBe(body[0].last_summary);
      expect(body[0].latest_ts).toBe(body[0].last_ts);
      expect(body[0].unread_count).toBe(2);
      expect(body[0].max_seq).toBe(3);
    });

    it("returns 0 unread when all messages are read", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:00:00Z" });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:01:00Z" });
      cursorStore.push({ chain_id: "c1", participant_id: "bob", read_through_seq: 2 });

      const res = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      const body = res.json();
      expect(body[0].unread_count).toBe(0);
    });

    it("counts unread based on response_from too", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["carol"], response_from: "bob", ts: "2026-01-01T00:00:00Z" });

      const res = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].unread_count).toBe(1);
      expect(body[0].response_from).toBe("bob");
    });

    it("handles multiline summary/content rows without adapter failure", async () => {
      addMsg({
        chain_id: "c-multiline",
        seq: 1,
        from_id: "u-llm",
        notify: ["human"],
        summary: "Line one\nLine two",
        content: "First paragraph\nSecond paragraph",
      });

      const res = await app.inject({ method: "GET", url: "/api/chains?participant=human&limit=3" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].chain_id).toBe("c-multiline");
      expect(body[0].last_summary).toBe("Line one\nLine two");
    });
  });

  describe("GET /api/inbox", () => {
    it("requires for query parameter", async () => {
      const res = await app.inject({ method: "GET", url: "/api/inbox" });
      expect(res.statusCode).toBe(400);
    });

    it("returns only chains with unread messages", async () => {
      // c1: 2 messages, bob read all
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:00:00Z" });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:01:00Z" });
      cursorStore.push({ chain_id: "c1", participant_id: "bob", read_through_seq: 2 });

      // c2: 1 message, bob has not read
      addMsg({ chain_id: "c2", seq: 1, from_id: "carol", notify: ["bob"], ts: "2026-01-01T00:02:00Z" });

      const res = await app.inject({ method: "GET", url: "/api/inbox?for=bob" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].chain_id).toBe("c2");
      expect(body[0].unread_count).toBe(1);
    });
  });

  // --- AC 3: POST /api/chains/:chain_id/read updates or creates cursor ---
  describe("POST /api/chains/:chain_id/read", () => {
    it("creates a new cursor and returns 204", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"] });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"] });

      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob" },
      });
      expect(res.statusCode).toBe(204);

      // Verify cursor was created
      expect(cursorStore.length).toBe(1);
      expect(cursorStore[0]!.chain_id).toBe("c1");
      expect(cursorStore[0]!.participant_id).toBe("bob");
      expect(cursorStore[0]!.read_through_seq).toBe(2);
    });

    it("marks through a specific seq", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"] });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"] });
      addMsg({ chain_id: "c1", seq: 3, from_id: "alice", notify: ["bob"] });

      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob", through: 2 },
      });
      expect(res.statusCode).toBe(204);
      expect(cursorStore[0]!.read_through_seq).toBe(2);
    });

    it("updates existing cursor when new seq is higher", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"] });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"] });
      addMsg({ chain_id: "c1", seq: 3, from_id: "alice", notify: ["bob"] });

      cursorStore.push({ chain_id: "c1", participant_id: "bob", read_through_seq: 1 });

      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob" },
      });
      expect(res.statusCode).toBe(204);

      // Cursor should be updated to seq 3, not a new row
      expect(cursorStore.length).toBe(1);
      expect(cursorStore[0]!.read_through_seq).toBe(3);
    });

    it("does not regress cursor when through is lower", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"] });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"] });

      cursorStore.push({ chain_id: "c1", participant_id: "bob", read_through_seq: 2 });

      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob", through: 1 },
      });
      expect(res.statusCode).toBe(204);
      expect(cursorStore[0]!.read_through_seq).toBe(2);
    });

    it("rejects missing participant", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects invalid through value", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob", through: -1 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // --- AC 4: Only explicit cursor updates mark a chain read ---
  describe("read/unread protocol behavior", () => {
    it("delivery does not auto-mark as read", async () => {
      const writeRes = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: {
          producer_key: "proto-1",
          from_id: "alice",
          notify: ["bob"],
          type: "chat",
          content: "Hello",
        },
      });
      expect(writeRes.statusCode).toBe(201);
      const { chain_id } = writeRes.json();

      const inboxRes = await app.inject({ method: "GET", url: "/api/inbox?for=bob" });
      const inbox = inboxRes.json();
      const entry = inbox.find((e: { chain_id: string }) => e.chain_id === chain_id);
      expect(entry).toBeDefined();
      expect(entry.unread_count).toBe(1);
    });

    it("explicit mark-read drops unread count", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:00:00Z" });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:01:00Z" });

      // Before mark-read: 2 unread
      let chainsRes = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      expect(chainsRes.json()[0].unread_count).toBe(2);

      // Mark read
      await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob" },
      });

      // After mark-read: 0 unread
      chainsRes = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      expect(chainsRes.json()[0].unread_count).toBe(0);
    });

    it("partial mark-read leaves later messages unread", async () => {
      addMsg({ chain_id: "c1", seq: 1, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:00:00Z" });
      addMsg({ chain_id: "c1", seq: 2, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:01:00Z" });
      addMsg({ chain_id: "c1", seq: 3, from_id: "alice", notify: ["bob"], ts: "2026-01-01T00:02:00Z" });

      await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob", through: 1 },
      });

      const chainsRes = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      expect(chainsRes.json()[0].unread_count).toBe(2);
    });
  });

  // --- Regression: large chain history (no silent cap) ---
  describe("uncapped chain history", () => {
    it("returns >1000 messages without truncation", async () => {
      const total = 1200;
      for (let i = 1; i <= total; i++) {
        addMsg({ chain_id: "big", seq: i, ts: `2026-01-01T00:${String(i).padStart(4, "0")}Z` });
      }

      const res = await app.inject({ method: "GET", url: "/api/chains/big/messages" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(total);
      expect(body[0].seq).toBe(1);
      expect(body[total - 1].seq).toBe(total);
    });

    it("respects explicit limit when provided", async () => {
      for (let i = 1; i <= 50; i++) {
        addMsg({ chain_id: "lim", seq: i });
      }
      const res = await app.inject({ method: "GET", url: "/api/chains/lim/messages?limit=10" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(10);
    });
  });

  // --- Regression: mark-read uses true latest seq beyond old cap ---
  describe("mark-read with large chain", () => {
    it("marks through the true latest seq in a >1000 message chain", async () => {
      const total = 1100;
      for (let i = 1; i <= total; i++) {
        addMsg({ chain_id: "bigread", seq: i, notify: ["bob"] });
      }

      const res = await app.inject({
        method: "POST",
        url: "/api/chains/bigread/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob" },
      });
      expect(res.statusCode).toBe(204);

      // Cursor must be at seq 1100, not capped at 1000
      expect(cursorStore.length).toBe(1);
      expect(cursorStore[0]!.read_through_seq).toBe(total);
    });
  });

  // --- Regression: inbox with >50 chains ---
  describe("inbox limit behavior", () => {
    it("returns all unread chains when no limit is set, even beyond 50", async () => {
      for (let i = 1; i <= 60; i++) {
        addMsg({
          chain_id: `inbox-chain-${i}`,
          seq: 1,
          from_id: "alice",
          notify: ["bob"],
          ts: `2026-01-01T00:${String(i).padStart(4, "0")}Z`,
        });
      }

      const res = await app.inject({ method: "GET", url: "/api/inbox?for=bob" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(60);
    });

    it("GET /api/chains returns all chains when no limit is set", async () => {
      for (let i = 1; i <= 60; i++) {
        addMsg({
          chain_id: `chain-${i}`,
          seq: 1,
          from_id: "alice",
          notify: ["bob"],
          ts: `2026-01-01T00:${String(i).padStart(4, "0")}Z`,
        });
      }

      const res = await app.inject({ method: "GET", url: "/api/chains?participant=bob" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(60);
    });

    it("respects explicit inbox limit", async () => {
      for (let i = 1; i <= 20; i++) {
        addMsg({ chain_id: `il-${i}`, seq: 1, from_id: "alice", notify: ["bob"] });
      }

      const res = await app.inject({ method: "GET", url: "/api/inbox?for=bob&limit=5" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(5);
    });
  });

  // --- Regression: invalid limit values ---
  describe("invalid limit handling", () => {
    it("rejects limit=0 on chains", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains?participant=bob&limit=0" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects negative limit on messages", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains/c1/messages?limit=-5" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects non-numeric limit on inbox", async () => {
      const res = await app.inject({ method: "GET", url: "/api/inbox?for=bob&limit=abc" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects limit with trailing garbage like 10abc", async () => {
      const res1 = await app.inject({ method: "GET", url: "/api/chains?participant=bob&limit=10abc" });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({ method: "GET", url: "/api/chains/c1/messages?limit=5x" });
      expect(res2.statusCode).toBe(400);

      const res3 = await app.inject({ method: "GET", url: "/api/inbox?for=bob&limit=3.5" });
      expect(res3.statusCode).toBe(400);
    });
  });

  // --- Regression: identifier injection ---
  describe("identifier validation", () => {
    it("rejects chain_id with single quote", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains/test'OR'1'='1/messages" });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("BAD_REQUEST");
    });

    it("rejects participant with single quote in chains query", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains?participant=bob'--" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects participant with backslash in mark-read", async () => {
      addMsg({ chain_id: "c1", seq: 1 });
      const res = await app.inject({
        method: "POST",
        url: "/api/chains/c1/read",
        headers: { "content-type": "application/json" },
        payload: { participant: "bob\\drop" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects chain_id with semicolon", async () => {
      const res = await app.inject({ method: "GET", url: "/api/chains/c1;DROP/messages" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects for param with control characters in inbox", async () => {
      const res = await app.inject({ method: "GET", url: "/api/inbox?for=bob%00evil" });
      expect(res.statusCode).toBe(400);
    });

    it("accepts valid identifiers with hyphens and underscores", async () => {
      addMsg({ chain_id: "my-chain_123", seq: 1, from_id: "alice", notify: ["bob"] });
      const res = await app.inject({ method: "GET", url: "/api/chains/my-chain_123/messages" });
      expect(res.statusCode).toBe(200);
    });
  });
});
