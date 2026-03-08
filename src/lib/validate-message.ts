import type { MessageType } from "./protocol-types.js";
import { HttpError } from "./http-errors.js";
import { randomUUID } from "node:crypto";

const VALID_TYPES: ReadonlySet<string> = new Set(["chat", "event", "status", "error"]);

interface RawInput {
  producer_key?: unknown;
  from_id?: unknown;
  notify?: unknown;
  response_from?: unknown;
  type?: unknown;
  event_type?: unknown;
  external_ref?: unknown;
  summary?: unknown;
  content?: unknown;
  meta?: unknown;
}

export interface ValidatedMessage {
  producer_key: string;
  from_id: string;
  notify: string[];
  response_from: string | null;
  type: MessageType;
  event_type: string | null;
  external_ref: string | null;
  summary: string | undefined;
  content: string;
  meta: unknown | null;
}

export interface ValidationDefaults {
  from_id: string;
  producer_key?: string;
}

function validationError(message: string): HttpError {
  return new HttpError(400, "VALIDATION_ERROR", message);
}

export function defaultProducerKey(): string {
  return `pk_${randomUUID()}`;
}

export function validateMessage(body: unknown, defaults?: ValidationDefaults): ValidatedMessage {
  if (!body || typeof body !== "object") {
    throw validationError("Request body must be a JSON object");
  }

  const input = body as RawInput;

  const producerKey = input.producer_key ?? defaults?.producer_key;
  if (typeof producerKey !== "string" || producerKey.length === 0) {
    throw validationError("producer_key is required and must be a non-empty string");
  }
  if (/\s/.test(producerKey)) {
    throw validationError("producer_key must not contain whitespace");
  }
  if (producerKey.length > 256) {
    throw validationError("producer_key exceeds 256 character limit");
  }

  const fromId = input.from_id ?? defaults?.from_id;
  if (typeof fromId !== "string" || fromId.length === 0) {
    throw validationError("from_id is required and must be a non-empty string");
  }
  if (fromId.length > 128) {
    throw validationError("from_id exceeds 128 character limit");
  }

  // notify: required array of non-empty strings, may be empty if response_from is present
  if (!Array.isArray(input.notify)) {
    throw validationError("notify is required and must be an array");
  }
  for (const n of input.notify) {
    if (typeof n !== "string" || n.length === 0) {
      throw validationError("Each notify entry must be a non-empty string");
    }
    if (n.length > 128) {
      throw validationError("notify entry exceeds 128 character limit");
    }
  }

  // type: required, must be valid
  if (typeof input.type !== "string" || !VALID_TYPES.has(input.type)) {
    throw validationError(`type must be one of: ${[...VALID_TYPES].join(", ")}`);
  }
  const type = input.type as MessageType;

  // event_type: required when type=event
  let event_type: string | null = null;
  if (type === "event") {
    if (typeof input.event_type !== "string" || input.event_type.length === 0) {
      throw validationError("event_type is required when type is 'event'");
    }
    event_type = input.event_type;
  } else if (input.event_type !== undefined && input.event_type !== null) {
    if (typeof input.event_type !== "string") {
      throw validationError("event_type must be a string when provided");
    }
    event_type = input.event_type;
  }

  // content: required, non-empty
  if (typeof input.content !== "string" || input.content.length === 0) {
    throw validationError("content is required and must be a non-empty string");
  }
  if (input.content.length > 100_000) {
    throw validationError("content exceeds 100000 character limit");
  }

  // response_from: optional
  let response_from: string | null = null;
  if (input.response_from !== undefined && input.response_from !== null) {
    if (typeof input.response_from !== "string" || input.response_from.length === 0) {
      throw validationError("response_from must be a non-empty string when provided");
    }
    if (input.response_from.length > 128) {
      throw validationError("response_from exceeds 128 character limit");
    }
    response_from = input.response_from;
  }
  if (input.notify.length === 0 && response_from === null) {
    throw validationError("at least one recipient is required: notify or response_from");
  }

  // external_ref: optional
  let external_ref: string | null = null;
  if (input.external_ref !== undefined && input.external_ref !== null) {
    if (typeof input.external_ref !== "string") {
      throw validationError("external_ref must be a string when provided");
    }
    external_ref = input.external_ref;
  }

  // summary: optional, up to 300 chars
  let summary: string | undefined;
  if (input.summary !== undefined && input.summary !== null) {
    if (typeof input.summary !== "string") {
      throw validationError("summary must be a string when provided");
    }
    if (input.summary.length > 300) {
      throw validationError("summary exceeds 300 character limit");
    }
    summary = input.summary;
  }

  // meta: optional, must be valid JSON-compatible value
  let meta: unknown | null = null;
  if (input.meta !== undefined && input.meta !== null) {
    // If it arrives as parsed JSON (object/array/number/boolean), it's valid.
    // If it's a string, try to parse it as JSON.
    if (typeof input.meta === "string") {
      try {
        meta = JSON.parse(input.meta);
      } catch {
        throw validationError("meta must be valid JSON");
      }
      if (input.meta.length > 10_000) {
        throw validationError("meta exceeds 10000 character limit");
      }
    } else {
      const serialized = JSON.stringify(input.meta);
      if (serialized.length > 10_000) {
        throw validationError("meta exceeds 10000 character limit when serialized");
      }
      meta = input.meta;
    }
  }

  return {
    producer_key: producerKey,
    from_id: fromId,
    notify: input.notify as string[],
    response_from,
    type,
    event_type,
    external_ref,
    summary,
    content: input.content,
    meta,
  };
}
