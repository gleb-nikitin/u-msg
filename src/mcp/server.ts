import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { UDbAdapter } from "../adapters/u-db.js";
import { HttpError } from "../lib/http-errors.js";
import { safeIdentifier } from "../lib/safe-identifier.js";
import { defaultProducerKey, validateMessage } from "../lib/validate-message.js";
import { listDigest } from "../services/digest.js";
import { listChains } from "../services/list-chains.js";
import { listInbox } from "../services/list-inbox.js";
import { markRead } from "../services/mark-read.js";
import type { MessagePublisher } from "../services/publish-new-message.js";
import { readMessageHistory } from "../services/read-message-history.js";
import { writeMessage } from "../services/write-message.js";

const DEFAULT_CHAIN_LIMIT = 20;
const DEFAULT_DIGEST_LIMIT = 50;
const MAX_DIGEST_LIMIT = 500;

const limitSchema = z.number().int().positive().optional();
const requiredIdentifierSchema = z.string().min(1);
const optionalStringSchema = z.string().min(1).optional().nullable();
const messageTypeSchema = z.enum(["chat", "event", "status", "error"]).optional();
const metaSchema = z.record(z.unknown()).optional().nullable();

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value),
      },
    ],
  };
}

function errorResult(error: unknown): CallToolResult {
  if (error instanceof HttpError) {
    return {
      content: [
        {
          type: "text",
          text: error.message,
        },
      ],
      structuredContent: {
        statusCode: error.statusCode,
        code: error.code,
      },
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: "Internal error",
      },
    ],
    isError: true,
  };
}

function registerTool(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: z.ZodTypeAny,
  handler: (args: any) => Promise<CallToolResult>,
): void {
  server.registerTool(name, { description, inputSchema }, async (args) => {
    try {
      return await handler(args);
    } catch (error: unknown) {
      return errorResult(error);
    }
  });
}

export function createMcpServer(udb: UDbAdapter, publisher: MessagePublisher): McpServer {
  const server = new McpServer({
    name: "u-msg",
    version: "0.1.0",
  });

  registerTool(
    server,
    "list_chains",
    "List chains for a participant using raw backend field names.",
    z.object({
      participant: requiredIdentifierSchema,
      limit: limitSchema,
    }),
    async ({ participant, limit }) => {
      const participantId = safeIdentifier(participant, "participant");
      const result = await listChains(udb, participantId, limit ?? DEFAULT_CHAIN_LIMIT);
      return jsonResult(result);
    },
  );

  registerTool(
    server,
    "get_inbox",
    "List unread chains for a participant.",
    z.object({
      participant: requiredIdentifierSchema,
      limit: limitSchema,
    }),
    async ({ participant, limit }) => {
      const participantId = safeIdentifier(participant, "participant");
      const result = await listInbox(udb, participantId, limit ?? DEFAULT_CHAIN_LIMIT);
      return jsonResult(result);
    },
  );

  registerTool(
    server,
    "get_digest",
    "List summary-only digest entries for a participant.",
    z.object({
      participant: requiredIdentifierSchema,
      limit: limitSchema,
    }),
    async ({ participant, limit }) => {
      const participantId = safeIdentifier(participant, "participant");
      const resolvedLimit = Math.min(limit ?? DEFAULT_DIGEST_LIMIT, MAX_DIGEST_LIMIT);
      const result = await listDigest(udb, participantId, resolvedLimit);
      return jsonResult(result);
    },
  );

  registerTool(
    server,
    "read_chain",
    "Read full message history for a chain in ascending seq order.",
    z.object({
      chain_id: requiredIdentifierSchema,
      limit: limitSchema,
    }),
    async ({ chain_id, limit }) => {
      const chainId = safeIdentifier(chain_id, "chain_id");
      const result = await readMessageHistory(udb, chainId, limit);
      return jsonResult(result);
    },
  );

  registerTool(
    server,
    "send_message",
    "Append a message to an existing chain.",
    z.object({
      participant: requiredIdentifierSchema,
      chain_id: requiredIdentifierSchema,
      content: z.string().min(1),
      notify: z.array(z.string()),
      response_from: optionalStringSchema,
      summary: z.string().optional(),
      type: messageTypeSchema,
      event_type: optionalStringSchema,
      external_ref: optionalStringSchema,
      meta: metaSchema,
    }),
    async ({ participant, chain_id, ...body }) => {
      const senderId = safeIdentifier(participant, "participant");
      const chainId = safeIdentifier(chain_id, "chain_id");
      const validated = validateMessage(
        {
          ...body,
          type: body.type ?? "chat",
        },
        {
          from_id: senderId,
          producer_key: defaultProducerKey(),
        },
      );
      const result = await writeMessage(udb, validated, chainId, publisher);
      return jsonResult(result);
    },
  );

  registerTool(
    server,
    "create_chain",
    "Create a new chain with an initial message.",
    z.object({
      participant: requiredIdentifierSchema,
      content: z.string().min(1),
      notify: z.array(z.string()),
      response_from: optionalStringSchema,
      summary: z.string().optional(),
      type: messageTypeSchema,
      event_type: optionalStringSchema,
      external_ref: optionalStringSchema,
      meta: metaSchema,
    }),
    async ({ participant, ...body }) => {
      const senderId = safeIdentifier(participant, "participant");
      const validated = validateMessage(
        {
          ...body,
          type: body.type ?? "chat",
        },
        {
          from_id: senderId,
          producer_key: defaultProducerKey(),
        },
      );
      const result = await writeMessage(udb, validated, undefined, publisher);
      return jsonResult(result);
    },
  );

  registerTool(
    server,
    "mark_read",
    "Advance the read cursor for a participant in a chain.",
    z.object({
      chain_id: requiredIdentifierSchema,
      participant: requiredIdentifierSchema,
      through: limitSchema,
    }),
    async ({ chain_id, participant, through }) => {
      const chainId = safeIdentifier(chain_id, "chain_id");
      const participantId = safeIdentifier(participant, "participant");
      await markRead(udb, chainId, participantId, through);
      return jsonResult({ success: true });
    },
  );

  return server;
}
