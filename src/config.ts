export interface Config {
  port: number;
  host: string;
  mcp: {
    enabled: boolean;
  };
  /** Override paths for u-db commands. Empty string means resolve from PATH. */
  udb: {
    write: string;
    read: string;
    update: string;
    tablePrefix: string;
  };
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.UMSG_PORT ?? "8000", 10),
    host: process.env.UMSG_HOST ?? "0.0.0.0",
    mcp: {
      enabled: process.env.UMSG_MCP_ENABLED !== "false",
    },
    udb: {
      write: process.env.UDB_WRITE_CMD ?? "u-db-write",
      read: process.env.UDB_READ_CMD ?? "u-db-read",
      update: process.env.UDB_UPDATE_CMD ?? "u-db-update",
      tablePrefix: process.env.UMSG_UDB_TABLE_PREFIX ?? "msg",
    },
  };
}
