import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { StoredMessage } from "../src/lib/protocol-types.js";

let mailStore: StoredMessage[] = [];
let readCursors: Array<{ chain_id: string; participant_id: string; read_through_seq: number }> = [];
let seqCounter = 0;
const writeMailCalls: Array<{ cols: string[]; vals: unknown[] }> = [];
const writeCursorCalls: Array<{ chain_id: string; participant_id: string; seq: number }> = [];
const updateCursorCalls: Array<{ chain_id: string; participant_id: string; seq: number }> = [];

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

function parseWhereValue(where: string, field: string): string | undefined {
  const match = where.match(new RegExp(`${field}='([^']+)'`));
  return match?.[1];
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
      const isWrite = cmd.includes("write");
      const isUpdate = cmd.includes("update");

      if (isRead && table === "msg-mail") {
        const whereIdx = args.indexOf("--where");
        const where = whereIdx >= 0 ? args[whereIdx + 1]! : undefined;
        const orderIdx = args.indexOf("--order");
        const order = orderIdx >= 0 ? args[orderIdx + 1]! : "ts DESC";
        const limitIdx = args.indexOf("--limit");
        const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]!, 10) : 100_000;

        let rows = [...mailStore];
        if (where) {
          const chainId = parseWhereValue(where, "chain_id");
          if (chainId !== undefined) {
            rows = rows.filter((row) => row.chain_id === chainId);
          }
        }

        rows.sort((a, b) => {
          if (order === "seq ASC") return a.seq - b.seq;
          if (order === "seq DESC") return b.seq - a.seq;
          return a.ts > b.ts ? -1 : 1;
        });
        rows = rows.slice(0, limit);

        const header = "ts\tproducer_key\tmsg_id\tchain_id\tseq\tfrom_id\tnotify\tresponse_from\ttype\tevent_type\texternal_ref\tsummary\tcontent\tmeta";
        const lines = rows.map((row) =>
          [
            row.ts,
            row.producer_key,
            row.msg_id,
            row.chain_id,
            row.seq,
            row.from_id,
            JSON.stringify(row.notify),
            row.response_from ?? "",
            row.type,
            row.event_type ?? "",
            row.external_ref ?? "",
            row.summary,
            row.content,
            row.meta === null ? "null" : JSON.stringify(row.meta),
          ].join("\t"),
        );
        cb(null, { stdout: [header, ...lines].join("\n") + "\n", stderr: "" });
        return;
      }

      if (isRead && table === "msg-mail_read_cursor") {
        const whereIdx = args.indexOf("--where");
        const where = whereIdx >= 0 ? args[whereIdx + 1]! : "";
        const chainId = parseWhereValue(where, "chain_id");
        const participantId = parseWhereValue(where, "participant_id");
        const rows = readCursors.filter((row) => {
          if (chainId !== undefined && row.chain_id !== chainId) return false;
          if (participantId !== undefined && row.participant_id !== participantId) return false;
          return true;
        });
        const header = "updated_ts\tchain_id\tparticipant_id\tread_through_seq";
        const lines = rows.map((row) =>
          [new Date().toISOString(), row.chain_id, row.participant_id, row.read_through_seq].join("\t"),
        );
        cb(null, { stdout: [header, ...lines].join("\n") + "\n", stderr: "" });
        return;
      }

      if (isWrite && table === "msg-mail") {
        const colsIdx = args.indexOf("--cols");
        const valsIdx = args.indexOf("--vals");
        const cols = colsIdx >= 0 ? args[colsIdx + 1]!.split(",") : [];
        const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];
        writeMailCalls.push({ cols, vals });

        const chainId = cols.includes("chain_id") ? String(vals[cols.indexOf("chain_id")]) : `chain-${seqCounter + 1}`;
        const seq = mailStore.filter((row) => row.chain_id === chainId).length + 1;
        const msgId = `${chainId}-${seq}`;
        const notifyRaw = cols.includes("notify") ? vals[cols.indexOf("notify")] : "[]";
        const notify = JSON.parse(String(notifyRaw)) as string[];
        const responseFrom = cols.includes("response_from") ? String(vals[cols.indexOf("response_from")]) : null;
        const meta = cols.includes("meta") ? JSON.parse(String(vals[cols.indexOf("meta")])) : null;

        addMsg({
          chain_id: chainId,
          seq,
          msg_id: msgId,
          producer_key: String(vals[cols.indexOf("producer_key")]),
          from_id: String(vals[cols.indexOf("from_id")]),
          notify,
          response_from: responseFrom,
          type: String(vals[cols.indexOf("type")]) as StoredMessage["type"],
          event_type: cols.includes("event_type") ? String(vals[cols.indexOf("event_type")]) : null,
          external_ref: cols.includes("external_ref") ? String(vals[cols.indexOf("external_ref")]) : null,
          summary: String(vals[cols.indexOf("summary")]),
          content: String(vals[cols.indexOf("content")]),
          meta,
        });

        cb(null, { stdout: `ok\t${msgId}\t${chainId}\t${seq}\n`, stderr: "" });
        return;
      }

      if (isWrite && table === "msg-mail_read_cursor") {
        const valsIdx = args.indexOf("--vals");
        const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];
        const [chainId, participantId, seq] = vals as [string, string, number];
        writeCursorCalls.push({ chain_id: chainId, participant_id: participantId, seq });
        readCursors.push({ chain_id: chainId, participant_id: participantId, read_through_seq: seq });
        cb(null, { stdout: "ok\n", stderr: "" });
        return;
      }

      if (isUpdate && table === "msg-mail_read_cursor") {
        const valsIdx = args.indexOf("--vals");
        const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];
        const whereIdx = args.indexOf("--where");
        const where = whereIdx >= 0 ? args[whereIdx + 1]! : "";
        const chainId = parseWhereValue(where, "chain_id")!;
        const participantId = parseWhereValue(where, "participant_id")!;
        const seq = Number(vals[0]);
        updateCursorCalls.push({ chain_id: chainId, participant_id: participantId, seq });
        readCursors = readCursors.map((row) =>
          row.chain_id === chainId && row.participant_id === participantId
            ? { ...row, read_through_seq: seq }
            : row,
        );
        cb(null, { stdout: "ok\n", stderr: "" });
        return;
      }

      cb(null, { stdout: "", stderr: "" });
    },
  };
});

function mcpPayload(id: number, method: string, params?: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params,
  };
}

function mcpHeaders(includeProtocolVersion = true) {
  return {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...(includeProtocolVersion ? { "mcp-protocol-version": "2025-03-26" } : {}),
  };
}

function parseToolText(res: Awaited<ReturnType<FastifyInstance["inject"]>>) {
  const body = res.json();
  return JSON.parse(body.result.content[0].text);
}

describe("MCP route", () => {
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
    readCursors = [];
    seqCounter = 0;
    writeMailCalls.length = 0;
    writeCursorCalls.length = 0;
    updateCursorCalls.length = 0;
  });

  it("responds to initialize and tools/list with all 7 tools", async () => {
    const initRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(false),
      payload: mcpPayload(1, "initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "0.1" },
      }),
    });

    expect(initRes.statusCode).toBe(200);
    expect(initRes.json().result.protocolVersion).toBe("2025-03-26");

    const toolsRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(2, "tools/list", {}),
    });

    expect(toolsRes.statusCode).toBe(200);
    const names = toolsRes.json().result.tools.map((tool: { name: string }) => tool.name).sort();
    expect(names).toEqual([
      "create_chain",
      "get_digest",
      "get_inbox",
      "list_chains",
      "mark_read",
      "read_chain",
      "send_message",
    ]);
  });

  it("returns expected shapes for read tools", async () => {
    addMsg({
      chain_id: "c1",
      seq: 1,
      from_id: "alice",
      notify: ["bob"],
      summary: "first",
      content: "hello",
      ts: "2026-01-01T00:00:00.000Z",
    });
    addMsg({
      chain_id: "c1",
      seq: 2,
      from_id: "bob",
      notify: ["alice"],
      summary: "reply",
      content: "world",
      ts: "2026-01-01T00:01:00.000Z",
    });
    addMsg({
      chain_id: "c2",
      seq: 1,
      from_id: "carol",
      notify: ["bob"],
      summary: "other",
      content: "digest",
      ts: "2026-01-01T00:02:00.000Z",
      type: "status",
    });
    readCursors.push({ chain_id: "c1", participant_id: "bob", read_through_seq: 1 });

    const chainsRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(3, "tools/call", {
        name: "list_chains",
        arguments: { participant: "bob" },
      }),
    });
    const chains = parseToolText(chainsRes);
    expect(chains).toHaveLength(2);
    expect(chains[0]).toHaveProperty("chain_id");
    expect(chains[0]).toHaveProperty("unread_count");

    const inboxRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(4, "tools/call", {
        name: "get_inbox",
        arguments: { participant: "bob" },
      }),
    });
    const inbox = parseToolText(inboxRes);
    expect(inbox.map((entry: { chain_id: string }) => entry.chain_id)).toEqual(["c2"]);

    const digestRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(5, "tools/call", {
        name: "get_digest",
        arguments: { participant: "bob" },
      }),
    });
    const digest = parseToolText(digestRes);
    expect(digest[0]).toEqual({
      chain_id: "c2",
      seq: 1,
      from_id: "carol",
      summary: "other",
      ts: "2026-01-01T00:02:00.000Z",
      type: "status",
    });

    const readRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(6, "tools/call", {
        name: "read_chain",
        arguments: { chain_id: "c1" },
      }),
    });
    const messages = parseToolText(readRes);
    expect(messages.map((message: { seq: number }) => message.seq)).toEqual([1, 2]);
  });

  it("supports create_chain, send_message, and mark_read flows", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(7, "tools/call", {
        name: "create_chain",
        arguments: {
          participant: "alice",
          notify: ["bob"],
          content: "Initial message",
        },
      }),
    });

    const created = parseToolText(createRes);
    expect(created).toHaveProperty("chain_id");
    expect(created).toHaveProperty("msg_id");
    expect(created.seq).toBe(1);
    expect(writeMailCalls[0]?.cols).not.toContain("chain_id");

    const sendRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(8, "tools/call", {
        name: "send_message",
        arguments: {
          participant: "alice",
          chain_id: created.chain_id,
          notify: ["bob"],
          content: "Follow-up",
          type: "chat",
        },
      }),
    });

    const sent = parseToolText(sendRes);
    expect(sent.chain_id).toBe(created.chain_id);
    expect(sent.seq).toBe(2);
    expect(writeMailCalls[1]?.vals[writeMailCalls[1]?.cols.indexOf("chain_id") ?? -1]).toBe(created.chain_id);

    const markReadRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(9, "tools/call", {
        name: "mark_read",
        arguments: {
          chain_id: created.chain_id,
          participant: "bob",
        },
      }),
    });

    expect(parseToolText(markReadRes)).toEqual({ success: true });
    expect(writeCursorCalls).toEqual([{ chain_id: created.chain_id, participant_id: "bob", seq: 2 }]);

    const throughRes = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(10, "tools/call", {
        name: "mark_read",
        arguments: {
          chain_id: created.chain_id,
          participant: "bob",
          through: 1,
        },
      }),
    });

    expect(parseToolText(throughRes)).toEqual({ success: true });
    expect(updateCursorCalls).toEqual([]);
  });

  it("maps validation failures to MCP tool errors with status details", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: mcpHeaders(),
      payload: mcpPayload(11, "tools/call", {
        name: "list_chains",
        arguments: {
          participant: "bob;drop",
        },
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toBe("participant contains invalid characters");
    expect(body.result.structuredContent).toEqual({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
  });

  it("does not register /mcp when disabled", async () => {
    process.env.UMSG_MCP_ENABLED = "false";
    const disabledApp = await buildApp(loadConfig());

    try {
      const res = await disabledApp.inject({
        method: "POST",
        url: "/mcp",
        headers: mcpHeaders(false),
        payload: mcpPayload(12, "initialize", {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "0.1" },
        }),
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await disabledApp.close();
      delete process.env.UMSG_MCP_ENABLED;
    }
  });
});
