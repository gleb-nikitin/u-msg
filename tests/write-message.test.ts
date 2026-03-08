import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { FastifyInstance } from "fastify";

// Recorded calls for inspecting adapter input
const recordedCalls: Array<{ cols: string[]; vals: unknown[] }> = [];

// Mock child_process.execFile to avoid needing real u-db commands
vi.mock("node:child_process", () => {
  let callCount = 0;
  const producerKeys = new Map<string, { msg_id: string; chain_id: string; seq: number }>();

  return {
    execFile: (
      _cmd: string,
      args: string[],
      _opts: unknown,
      cb: (err: unknown, result: { stdout: string; stderr: string }) => void,
    ) => {
      const valsIdx = args.indexOf("--vals");
      const vals = valsIdx >= 0 ? JSON.parse(args[valsIdx + 1]!) : [];
      const colsIdx = args.indexOf("--cols");
      const cols = colsIdx >= 0 ? args[colsIdx + 1]!.split(",") : [];

      // Record call for test inspection
      recordedCalls.push({ cols, vals });

      // Extract producer_key and chain_id from cols/vals
      const pkIdx = cols.indexOf("producer_key");
      const producerKey = pkIdx >= 0 ? String(vals[pkIdx]) : "";
      const chainIdIdx = cols.indexOf("chain_id");
      const chainId = chainIdIdx >= 0 ? String(vals[chainIdIdx]) : "";

      // Simulate exit code 4 for unknown chain_id
      if (chainId === "unknown-chain") {
        const err = new Error("chain not found") as Error & { code: number };
        err.code = 4;
        cb(err, { stdout: "", stderr: "unknown chain_id" });
        return;
      }

      // Simulate exit code 3 for queue failure
      if (chainId === "queue-fail-chain") {
        const err = new Error("queue failure") as Error & { code: number };
        err.code = 3;
        cb(err, { stdout: "", stderr: "queue failure" });
        return;
      }

      // Duplicate detection by producer_key
      if (producerKey && producerKeys.has(producerKey)) {
        const prev = producerKeys.get(producerKey)!;
        cb(null, {
          stdout: `dup\t${prev.msg_id}\t${prev.chain_id}\t${prev.seq}\n`,
          stderr: "",
        });
        return;
      }

      callCount++;
      const resolvedChainId = chainId || `chain-${callCount}`;
      const seq = callCount;
      const msgId = `${resolvedChainId}_${seq}`;

      if (producerKey) {
        producerKeys.set(producerKey, { msg_id: msgId, chain_id: resolvedChainId, seq });
      }

      cb(null, {
        stdout: `ok\t${msgId}\t${resolvedChainId}\t${seq}\n`,
        stderr: "",
      });
    },
  };
});

function lastCall() {
  return recordedCalls[recordedCalls.length - 1]!;
}

function colVal(call: { cols: string[]; vals: unknown[] }, col: string): unknown {
  const idx = call.cols.indexOf(col);
  return idx >= 0 ? call.vals[idx] : undefined;
}

const VALID_BODY = {
  producer_key: "pk-001",
  from_id: "alice",
  notify: ["bob"],
  type: "chat",
  content: "Hello, world!",
};

const HEADERS = { "x-participant-id": "alice", "content-type": "application/json" };

describe("write-message flows", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = loadConfig();
    app = await buildApp(config);
  });

  afterAll(async () => {
    await app.close();
  });

  // --- AC 1: New-chain writes ---
  describe("POST /api/chains (new chain)", () => {
    it("returns canonical {msg_id, chain_id, seq} JSON", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "new-chain-1" },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty("msg_id");
      expect(body).toHaveProperty("chain_id");
      expect(body).toHaveProperty("seq");
      expect(typeof body.msg_id).toBe("string");
      expect(typeof body.chain_id).toBe("string");
      expect(typeof body.seq).toBe("number");
    });
  });

  // --- AC 2: Append writes ---
  describe("POST /api/chains/:chain_id/messages (append)", () => {
    it("returns the same response shape with incremented seq", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains/existing-chain/messages",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "append-1" },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty("msg_id");
      expect(body).toHaveProperty("chain_id");
      expect(body).toHaveProperty("seq");
    });
  });

  // --- AC 3: Duplicate retries ---
  describe("duplicate writes", () => {
    it("return success with no additional side effects", async () => {
      const payload = { ...VALID_BODY, producer_key: "dup-test-1" };

      const res1 = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload,
      });
      expect(res1.statusCode).toBe(201);
      const body1 = res1.json();

      const res2 = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload,
      });
      expect(res2.statusCode).toBe(201);
      const body2 = res2.json();

      // Same response for both
      expect(body2.msg_id).toBe(body1.msg_id);
      expect(body2.chain_id).toBe(body1.chain_id);
      expect(body2.seq).toBe(body1.seq);
    });
  });

  // --- AC 4: Summary fallback — prove persisted adapter input ---
  describe("summary fallback", () => {
    it("generates v0 summary from content when omitted and sends it to adapter", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "sum-gen-1", content: "Just a plain message" },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      expect(call.cols).toContain("summary");
      expect(colVal(call, "summary")).toBe("Just a plain message");
    });

    it("generates truncated summary for long content", async () => {
      const longContent = "a".repeat(300);
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "sum-gen-2", content: longContent },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      const summary = colVal(call, "summary") as string;
      expect(summary.length).toBe(203);
      expect(summary.endsWith("...")).toBe(true);
    });

    it("strips markdown from generated summary", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "sum-gen-3", content: "## Heading **bold**" },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      const summary = colVal(call, "summary") as string;
      expect(summary).not.toContain("#");
      expect(summary).not.toContain("*");
      expect(summary).toBe("Heading bold");
    });

    it("passes caller-supplied summary verbatim to adapter", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "sum-provided-1", summary: "My custom summary" },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      expect(colVal(call, "summary")).toBe("My custom summary");
    });
  });

  // --- AC 5: Queue failures return retriable error ---
  describe("queue failure handling", () => {
    it("returns 503 for u-db queue failure (exit code 3)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains/queue-fail-chain/messages",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "queue-fail-1" },
      });
      expect(res.statusCode).toBe(503);
      const body = res.json();
      expect(body.code).toBe("QUEUE_FAILURE");
    });
  });

  // --- AC 6: Validation and chain error mapping ---
  describe("validation errors", () => {
    it("rejects missing producer_key", async () => {
      const { producer_key: _, ...noKey } = VALID_BODY;
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: noKey,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects producer_key with whitespace", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "has space" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty notify array", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "val-1", notify: [] },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid type", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "val-2", type: "invalid" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects event type without event_type", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "val-3", type: "event" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty content", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "val-4", content: "" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects missing X-Participant-Id header", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: { "content-type": "application/json" },
        payload: { ...VALID_BODY, producer_key: "val-5" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("maps malformed JSON body to VALIDATION_ERROR", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: { ...HEADERS, "content-type": "application/json" },
        payload: "{invalid json",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });

    it("rejects non-object body with VALIDATION_ERROR", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: JSON.stringify("just a string"),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    });
  });

  describe("chain errors", () => {
    it("returns 404 for unknown chain_id (exit code 4)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains/unknown-chain/messages",
        headers: HEADERS,
        payload: { ...VALID_BODY, producer_key: "chain-err-1" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("CHAIN_ERROR");
    });
  });

  // --- Event type accepted ---
  describe("event type messages", () => {
    it("accepts event type with event_type field", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: {
          ...VALID_BODY,
          producer_key: "event-1",
          type: "event",
          event_type: "deploy",
        },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  // --- Optional fields ---
  describe("optional fields", () => {
    it("accepts response_from, external_ref, and meta", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: {
          ...VALID_BODY,
          producer_key: "opt-1",
          response_from: "bob",
          external_ref: "https://example.com",
          meta: { key: "value" },
        },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  // --- response_from implies notification ---
  describe("response_from implies notification", () => {
    it("adds response_from to notify when not already present", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: {
          ...VALID_BODY,
          producer_key: "rf-imply-1",
          notify: ["bob"],
          response_from: "carol",
        },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      const notify = JSON.parse(colVal(call, "notify") as string);
      expect(notify).toContain("carol");
      expect(notify).toContain("bob");
    });

    it("does not duplicate response_from when already in notify", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: {
          ...VALID_BODY,
          producer_key: "rf-imply-2",
          notify: ["bob", "carol"],
          response_from: "carol",
        },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      const notify = JSON.parse(colVal(call, "notify") as string);
      expect(notify.filter((n: string) => n === "carol").length).toBe(1);
    });

    it("does not modify notify when response_from is null", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chains",
        headers: HEADERS,
        payload: {
          ...VALID_BODY,
          producer_key: "rf-imply-3",
          notify: ["bob"],
        },
      });
      expect(res.statusCode).toBe(201);
      const call = lastCall();
      const notify = JSON.parse(colVal(call, "notify") as string);
      expect(notify).toEqual(["bob"]);
    });
  });
});

// --- Summary unit tests ---
describe("generateSummary", () => {
  it("strips markdown and truncates", async () => {
    const { generateSummary } = await import("../src/lib/summary.js");
    expect(generateSummary("Hello")).toBe("Hello");
    expect(generateSummary("# Heading")).toBe("Heading");
    expect(generateSummary("**bold**")).toBe("bold");
  });

  it("truncates long content to 200 chars with ...", async () => {
    const { generateSummary } = await import("../src/lib/summary.js");
    const long = "a".repeat(300);
    const result = generateSummary(long);
    expect(result.length).toBe(203); // 200 + "..."
    expect(result.endsWith("...")).toBe(true);
  });
});

// --- Validate unit tests ---
describe("validateMessage", () => {
  it("passes with valid input", async () => {
    const { validateMessage } = await import("../src/lib/validate-message.js");
    const result = validateMessage(VALID_BODY);
    expect(result.producer_key).toBe("pk-001");
    expect(result.from_id).toBe("alice");
    expect(result.notify).toEqual(["bob"]);
    expect(result.type).toBe("chat");
    expect(result.content).toBe("Hello, world!");
    expect(result.summary).toBeUndefined();
    expect(result.response_from).toBeNull();
    expect(result.event_type).toBeNull();
    expect(result.external_ref).toBeNull();
    expect(result.meta).toBeNull();
  });

  it("throws on missing required fields", async () => {
    const { validateMessage } = await import("../src/lib/validate-message.js");
    expect(() => validateMessage({})).toThrow();
    expect(() => validateMessage({ producer_key: "a" })).toThrow();
  });
});
