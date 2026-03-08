import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Config } from "../config.js";
import type { StoredMessage, ReadCursor } from "../lib/protocol-types.js";
import { adapterError, queueFailure, chainError } from "../lib/http-errors.js";

const execFileAsync = promisify(execFile);

/** u-db exit codes per protocol. */
const EXIT_QUEUE_FAILURE = 3;
const EXIT_CHAIN_ERROR = 4;

/** Column order returned by u-db-read hub-mail. */
const MAIL_COLUMNS = [
  "ts", "producer_key", "msg_id", "chain_id", "seq", "from_id",
  "notify", "response_from", "type", "event_type", "external_ref",
  "summary", "content", "meta",
] as const;

const CURSOR_COLUMNS = [
  "updated_ts", "chain_id", "participant_id", "read_through_seq",
] as const;

export interface WriteResult {
  status: "ok" | "dup";
  msg_id: string;
  chain_id: string;
  seq: number;
}

export class UDbAdapter {
  private readonly writeCmd: string;
  private readonly readCmd: string;
  private readonly updateCmd: string;

  constructor(config: Config) {
    this.writeCmd = config.udb.write;
    this.readCmd = config.udb.read;
    this.updateCmd = config.udb.update;
  }

  /** Write a message to hub-mail. */
  async writeMail(cols: string[], vals: unknown[]): Promise<WriteResult> {
    const { stdout } = await this.exec(this.writeCmd, [
      "hub-mail",
      "--cols", cols.join(","),
      "--vals", JSON.stringify(vals),
    ]);
    return this.parseWriteResult(stdout);
  }

  /** Read messages from hub-mail. */
  async readMail(where: string, order: string, limit?: number): Promise<StoredMessage[]> {
    const args = ["hub-mail", "--where", where, "--order", order];
    if (limit !== undefined) args.push("--limit", String(limit));
    const { stdout } = await this.exec(this.readCmd, args);
    return this.parseMailRows(stdout);
  }

  /** Read all recent mail (no where clause). */
  async readRecentMail(order: string, limit?: number): Promise<StoredMessage[]> {
    const args = ["hub-mail", "--order", order];
    if (limit !== undefined) args.push("--limit", String(limit));
    const { stdout } = await this.exec(this.readCmd, args);
    return this.parseMailRows(stdout);
  }

  /** Read the maximum seq for a chain. Returns 0 if chain is empty. */
  async readMaxSeq(chainId: string): Promise<number> {
    const rows = await this.readMail(`chain_id='${chainId}'`, "seq DESC", 1);
    return rows.length > 0 ? rows[0]!.seq : 0;
  }

  /** Read cursors from hub-mail_read_cursor. */
  async readCursors(where?: string, limit?: number): Promise<ReadCursor[]> {
    const args = ["hub-mail_read_cursor"];
    if (where) args.push("--where", where);
    args.push("--limit", String(limit ?? 10000));
    const { stdout } = await this.exec(this.readCmd, args);
    return this.parseCursorRows(stdout);
  }

  /** Write a new cursor row. */
  async writeCursor(chainId: string, participantId: string, seq: number): Promise<void> {
    await this.exec(this.writeCmd, [
      "hub-mail_read_cursor",
      "--cols", "chain_id,participant_id,read_through_seq",
      "--vals", JSON.stringify([chainId, participantId, seq]),
    ]);
  }

  /** Update an existing cursor row. */
  async updateCursor(chainId: string, participantId: string, seq: number): Promise<void> {
    await this.exec(this.updateCmd, [
      "hub-mail_read_cursor",
      "--cols", "read_through_seq",
      "--vals", JSON.stringify([seq]),
      "--where", `chain_id='${chainId}' AND participant_id='${participantId}'`,
    ]);
  }

  // --- internal ---

  private async exec(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      return await execFileAsync(cmd, args, { timeout: 10_000 });
    } catch (err: unknown) {
      const e = err as { code?: number; exitCode?: number; stderr?: string; message?: string };
      const exitCode = e.code ?? e.exitCode;
      if (exitCode === EXIT_QUEUE_FAILURE) {
        throw queueFailure("Storage queue failure — retry later");
      }
      if (exitCode === EXIT_CHAIN_ERROR) {
        throw chainError("Unknown chain_id");
      }
      throw adapterError(`u-db command failed: ${e.stderr ?? e.message ?? "unknown error"}`);
    }
  }

  private parseWriteResult(stdout: string): WriteResult {
    const line = stdout.trim().split("\n")[0];
    if (!line) throw adapterError("Empty u-db write output");
    const parts = line.split("\t");
    if (parts.length !== 4) {
      throw adapterError(`Unexpected u-db write output format: ${line}`);
    }
    const [status, msg_id, chain_id, seqStr] = parts;
    if (status !== "ok" && status !== "dup") {
      throw adapterError(`Unexpected u-db write status: ${status}`);
    }
    const seq = parseInt(seqStr!, 10);
    if (isNaN(seq)) throw adapterError(`Invalid seq in write output: ${seqStr}`);
    return { status: status as "ok" | "dup", msg_id: msg_id!, chain_id: chain_id!, seq };
  }

  private parseMailRows(stdout: string): StoredMessage[] {
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) return []; // header only or empty
    // Skip header line
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = line.split("\t");
      if (cols.length !== MAIL_COLUMNS.length) {
        throw adapterError(`Unexpected mail row column count: ${cols.length}`);
      }
      return {
        ts: cols[0]!,
        producer_key: cols[1]!,
        msg_id: cols[2]!,
        chain_id: cols[3]!,
        seq: parseInt(cols[4]!, 10),
        from_id: cols[5]!,
        notify: this.parseJsonArray(cols[6]!),
        response_from: cols[7] || null,
        type: cols[8] as StoredMessage["type"],
        event_type: cols[9] || null,
        external_ref: cols[10] || null,
        summary: cols[11]!,
        content: cols[12]!,
        meta: cols[13] ? this.tryParseJson(cols[13]) : null,
      };
    });
  }

  private parseCursorRows(stdout: string): ReadCursor[] {
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) return [];
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = line.split("\t");
      if (cols.length !== CURSOR_COLUMNS.length) {
        throw adapterError(`Unexpected cursor row column count: ${cols.length}`);
      }
      return {
        chain_id: cols[1]!,
        participant_id: cols[2]!,
        read_through_seq: parseInt(cols[3]!, 10),
      };
    });
  }

  private parseJsonArray(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [String(parsed)];
    } catch {
      return [raw];
    }
  }

  private tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
