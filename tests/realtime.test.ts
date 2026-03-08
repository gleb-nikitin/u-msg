import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";

// Mock child_process.execFile to avoid needing real u-db commands
let writeCallCount = 0;
vi.mock("node:child_process", () => {
  return {
    execFile: (
      _cmd: string,
      args: string[],
      _opts: unknown,
      cb: (err: unknown, result: { stdout: string; stderr: string }) => void,
    ) => {
      const colsIdx = args.indexOf("--cols");
      const cols = colsIdx >= 0 ? args[colsIdx + 1]!.split(",") : [];
      const valsIdx = args.indexOf("--vals");
      const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];

      const chainIdIdx = cols.indexOf("chain_id");
      const chainId = chainIdIdx >= 0 ? String(vals[chainIdIdx]) : `chain-${++writeCallCount}`;

      // Simulate exit code 3 for queue failure
      if (chainId === "queue-fail-chain") {
        const err = new Error("queue failure") as Error & { code: number };
        err.code = 3;
        cb(err, { stdout: "", stderr: "queue failure" });
        return;
      }

      const seq = writeCallCount;
      const msgId = `${chainId}_${seq}`;
      cb(null, { stdout: `ok\t${msgId}\t${chainId}\t${seq}`, stderr: "" });
    },
  };
});

let app: FastifyInstance;
let baseUrl: string;
let wsUrl: string;

beforeAll(async () => {
  const config = loadConfig();
  config.port = 0; // random port
  app = await buildApp(config);
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  baseUrl = address;
  wsUrl = address.replace("http", "ws");
});

afterAll(async () => {
  await app.close();
});

function connectWs(participantId: string): Promise<{ ws: WebSocket; messages: unknown[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}/ws/stream?participant=${participantId}`);
    const messages: unknown[] = [];

    ws.on("message", (data: Buffer | string) => {
      const raw = typeof data === "string" ? data : data.toString();
      messages.push(JSON.parse(raw));
    });

    ws.on("open", () => {
      // Wait for the connected message
      const check = setInterval(() => {
        if (messages.length > 0) {
          clearInterval(check);
          resolve({ ws, messages });
        }
      }, 10);
    });

    ws.on("error", reject);
  });
}

function waitForMessage(messages: unknown[], startIdx: number, timeoutMs = 2000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = setInterval(() => {
      if (messages.length > startIdx) {
        clearInterval(check);
        resolve(messages[startIdx]);
      } else if (Date.now() > deadline) {
        clearInterval(check);
        reject(new Error("Timed out waiting for message"));
      }
    }, 10);
  });
}

async function postMessage(
  chainId: string | undefined,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const url = chainId
    ? `${baseUrl}/api/chains/${chainId}/messages`
    : `${baseUrl}/api/chains`;

  const res = await app.inject({
    method: "POST",
    url: chainId ? `/api/chains/${chainId}/messages` : "/api/chains",
    headers: {
      "content-type": "application/json",
      "x-participant-id": (body.from_id as string) ?? "test-sender",
    },
    payload: body,
  });

  return { status: res.statusCode, body: JSON.parse(res.body) };
}

describe("Spec 004: Realtime new_message fan-out", () => {
  describe("AC 1: Subscribed participants receive new_message after writes", () => {
    it("delivers new_message to a subscribed participant on new chain", async () => {
      const { ws, messages } = await connectWs("alice");
      expect((messages[0] as Record<string, unknown>).type).toBe("connected");

      const msgIdx = messages.length;
      await postMessage(undefined, {
        producer_key: "rt-pk-1",
        from_id: "bob",
        notify: ["alice"],
        type: "chat",
        content: "Hello Alice",
        summary: "Hello Alice",
      });

      const event = await waitForMessage(messages, msgIdx) as Record<string, unknown>;
      expect(event.type).toBe("new_message");
      expect(event.summary).toBe("Hello Alice");
      expect(event.from_id).toBe("bob");
      expect(typeof event.chain_id).toBe("string");
      expect(typeof event.seq).toBe("number");

      ws.close();
    });

    it("delivers new_message to a subscribed participant on existing chain", async () => {
      // Create a chain first
      const createRes = await postMessage(undefined, {
        producer_key: "rt-pk-2",
        from_id: "bob",
        notify: ["carol"],
        type: "chat",
        content: "Setup chain",
      });
      const chainId = createRes.body.chain_id as string;

      const { ws, messages } = await connectWs("carol");
      const msgIdx = messages.length;

      await postMessage(chainId, {
        producer_key: "rt-pk-3",
        from_id: "bob",
        notify: ["carol"],
        type: "chat",
        content: "Follow-up",
        summary: "Follow-up msg",
      });

      const event = await waitForMessage(messages, msgIdx) as Record<string, unknown>;
      expect(event.type).toBe("new_message");
      expect(event.chain_id).toBe(chainId);
      expect(event.summary).toBe("Follow-up msg");

      ws.close();
    });

    it("delivers to multiple subscribed participants", async () => {
      const conn1 = await connectWs("dave");
      const conn2 = await connectWs("eve");

      const idx1 = conn1.messages.length;
      const idx2 = conn2.messages.length;

      await postMessage(undefined, {
        producer_key: "rt-pk-4",
        from_id: "frank",
        notify: ["dave", "eve"],
        type: "chat",
        content: "Hello both",
        summary: "Hello both",
      });

      const event1 = await waitForMessage(conn1.messages, idx1) as Record<string, unknown>;
      const event2 = await waitForMessage(conn2.messages, idx2) as Record<string, unknown>;

      expect(event1.type).toBe("new_message");
      expect(event2.type).toBe("new_message");
      expect(event1.chain_id).toBe(event2.chain_id);

      conn1.ws.close();
      conn2.ws.close();
    });
  });

  describe("AC 2: Non-participants do not receive the event", () => {
    it("does not deliver to a subscriber not in notify list", async () => {
      const { ws: wsAlice, messages: aliceMsgs } = await connectWs("alice-np");
      const { ws: wsBob, messages: bobMsgs } = await connectWs("bob-np");

      const aliceIdx = aliceMsgs.length;
      const bobIdx = bobMsgs.length;

      await postMessage(undefined, {
        producer_key: "rt-pk-5",
        from_id: "sender-np",
        notify: ["alice-np"],
        type: "chat",
        content: "Only for Alice",
        summary: "Only for Alice",
      });

      const aliceEvent = await waitForMessage(aliceMsgs, aliceIdx) as Record<string, unknown>;
      expect(aliceEvent.type).toBe("new_message");

      // Bob should NOT receive anything — wait briefly to confirm
      await new Promise((r) => setTimeout(r, 200));
      expect(bobMsgs.length).toBe(bobIdx);

      wsAlice.close();
      wsBob.close();
    });

    it("delivers to response_from participant even if not in notify", async () => {
      const { ws, messages } = await connectWs("responder");

      const msgIdx = messages.length;
      await postMessage(undefined, {
        producer_key: "rt-pk-6",
        from_id: "requester",
        notify: ["requester"],
        response_from: "responder",
        type: "chat",
        content: "Please respond",
        summary: "Please respond",
      });

      const event = await waitForMessage(messages, msgIdx) as Record<string, unknown>;
      expect(event.type).toBe("new_message");
      expect(event.from_id).toBe("requester");

      ws.close();
    });
  });

  describe("AC 3: WebSocket delivery failure does not break the write path", () => {
    it("write succeeds even when subscriber socket is closed mid-flow", async () => {
      const { ws, messages } = await connectWs("fragile");
      expect((messages[0] as Record<string, unknown>).type).toBe("connected");

      // Close the socket before the write
      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      // Write should still succeed
      const res = await postMessage(undefined, {
        producer_key: "rt-pk-7",
        from_id: "writer",
        notify: ["fragile"],
        type: "chat",
        content: "Should still persist",
      });

      expect(res.status).toBe(201);
      expect(res.body.msg_id).toBeDefined();
      expect(res.body.chain_id).toBeDefined();
      expect(res.body.seq).toBeDefined();
    });

    it("write succeeds when no subscribers are connected at all", async () => {
      const res = await postMessage(undefined, {
        producer_key: "rt-pk-8",
        from_id: "writer",
        notify: ["nobody-connected"],
        type: "chat",
        content: "No subscribers online",
      });

      expect(res.status).toBe(201);
      expect(res.body.msg_id).toBeDefined();
    });
  });

  describe("AC 4: Event payload matches the frozen UI contract", () => {
    it("has exactly the documented fields", async () => {
      const { ws, messages } = await connectWs("contract-check");
      const msgIdx = messages.length;

      await postMessage(undefined, {
        producer_key: "rt-pk-9",
        from_id: "sender",
        notify: ["contract-check"],
        type: "chat",
        content: "Contract validation",
        summary: "Contract validation",
      });

      const event = await waitForMessage(messages, msgIdx) as Record<string, unknown>;

      // Exactly these fields, no more, no less
      const keys = Object.keys(event).sort();
      expect(keys).toEqual(["chain_id", "from_id", "seq", "summary", "type"].sort());

      // Field types
      expect(event.type).toBe("new_message");
      expect(typeof event.chain_id).toBe("string");
      expect(typeof event.seq).toBe("number");
      expect(typeof event.summary).toBe("string");
      expect(typeof event.from_id).toBe("string");

      ws.close();
    });

    it("uses generated summary when sender omits it", async () => {
      const { ws, messages } = await connectWs("summary-gen");
      const msgIdx = messages.length;

      await postMessage(undefined, {
        producer_key: "rt-pk-10",
        from_id: "sender",
        notify: ["summary-gen"],
        type: "chat",
        content: "A short message without explicit summary",
      });

      const event = await waitForMessage(messages, msgIdx) as Record<string, unknown>;
      expect(event.type).toBe("new_message");
      expect(typeof event.summary).toBe("string");
      expect((event.summary as string).length).toBeGreaterThan(0);

      ws.close();
    });
  });

  describe("Regression: dedup and normalization", () => {
    it("duplicate notify values produce exactly one new_message per subscriber socket", async () => {
      const { ws, messages } = await connectWs("dedup-target");
      const msgIdx = messages.length;

      await postMessage(undefined, {
        producer_key: "rt-pk-dedup",
        from_id: "sender",
        notify: ["dedup-target", "dedup-target", "dedup-target"],
        type: "chat",
        content: "Should arrive once",
        summary: "Should arrive once",
      });

      const event = await waitForMessage(messages, msgIdx) as Record<string, unknown>;
      expect(event.type).toBe("new_message");
      expect(event.summary).toBe("Should arrive once");

      // Wait to confirm no extra deliveries
      await new Promise((r) => setTimeout(r, 200));
      expect(messages.length).toBe(msgIdx + 1);

      ws.close();
    });

    it("?participant=%20alice%20 behaves identically to alice", async () => {
      // Connect with padded whitespace participant
      const wsPadded = new WebSocket(`${wsUrl}/ws/stream?participant=%20alice-ws%20`);
      const paddedMessages: unknown[] = [];

      await new Promise<void>((resolve, reject) => {
        wsPadded.on("message", (data: Buffer | string) => {
          const raw = typeof data === "string" ? data : data.toString();
          paddedMessages.push(JSON.parse(raw));
        });
        wsPadded.on("open", () => {
          const check = setInterval(() => {
            if (paddedMessages.length > 0) {
              clearInterval(check);
              resolve();
            }
          }, 10);
        });
        wsPadded.on("error", reject);
      });

      // Connected payload should have trimmed participant
      const connected = paddedMessages[0] as Record<string, unknown>;
      expect(connected.type).toBe("connected");
      expect(connected.participant).toBe("alice-ws");

      // Messages sent to "alice-ws" should route to the padded connection
      const msgIdx = paddedMessages.length;
      await postMessage(undefined, {
        producer_key: "rt-pk-trim",
        from_id: "sender",
        notify: ["alice-ws"],
        type: "chat",
        content: "Routed to trimmed id",
        summary: "Routed to trimmed id",
      });

      const event = await waitForMessage(paddedMessages, msgIdx) as Record<string, unknown>;
      expect(event.type).toBe("new_message");
      expect(event.summary).toBe("Routed to trimmed id");

      wsPadded.close();
    });
  });

  describe("WebSocket connection lifecycle", () => {
    it("rejects connection without participant query parameter", async () => {
      const ws = new WebSocket(`${wsUrl}/ws/stream`);
      const messages: unknown[] = [];

      await new Promise<void>((resolve) => {
        ws.on("message", (data: Buffer | string) => {
          const raw = typeof data === "string" ? data : data.toString();
          messages.push(JSON.parse(raw));
        });
        ws.on("close", () => resolve());
        ws.on("error", () => resolve());
      });

      expect(messages.length).toBeGreaterThanOrEqual(1);
      const errMsg = messages[0] as Record<string, unknown>;
      expect(errMsg.type).toBe("error");
      expect(errMsg.code).toBe("BAD_REQUEST");
    });

    it("sends connected message with participant id on successful connection", async () => {
      const { ws, messages } = await connectWs("lifecycle-test");
      const connected = messages[0] as Record<string, unknown>;
      expect(connected.type).toBe("connected");
      expect(connected.participant).toBe("lifecycle-test");
      ws.close();
    });
  });
});
