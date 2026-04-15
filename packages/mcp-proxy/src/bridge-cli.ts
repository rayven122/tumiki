#!/usr/bin/env node
/**
 * stdio <-> Tumiki Desktop mcp-bridge.json (host:port).
 * Path optional: auto-resolves common Electron userData locations.
 */
import { readFileSync } from "node:fs";
import { connect } from "node:net";
import {
  formatDefaultSearchHint,
  resolveBridgeFilePath,
} from "./bridge-resolve.js";

const argv = process.argv.slice(2);
const pathArg = argv[0]?.trim() || undefined;

const resolved = resolveBridgeFilePath(pathArg);

if (!resolved) {
  if (pathArg || process.env.TUMIKI_MCP_BRIDGE_FILE?.trim()) {
    process.stderr.write(
      "tumiki-mcp-bridge: invalid or missing mcp-bridge.json at the path you set.\n",
    );
  } else {
    process.stderr.write(
      "tumiki-mcp-bridge: no mcp-bridge.json found. Start Tumiki Desktop and enable MCP.\n" +
        "  Typical locations:\n  " +
        formatDefaultSearchHint().replace(/\n/g, "\n  ") +
        "\n" +
        "  Or pass the file path: tumiki-mcp-bridge /path/to/mcp-bridge.json\n",
    );
  }
  process.exit(1);
}

if (
  process.env.TUMIKI_MCP_BRIDGE_VERBOSE === "1" &&
  resolved.source === "auto"
) {
  process.stderr.write(`tumiki-mcp-bridge: using ${resolved.path}\n`);
}

const pathArgFinal = resolved.path;

let raw: string;
try {
  raw = readFileSync(pathArgFinal, "utf8");
} catch (e) {
  process.stderr.write(
    `tumiki-mcp-bridge: cannot read ${pathArgFinal}: ${e instanceof Error ? e.message : String(e)}\n`,
  );
  process.exit(1);
}

let host: string;
let port: number;
try {
  const j = JSON.parse(raw) as { host?: unknown; port?: unknown };
  if (typeof j.host !== "string" || typeof j.port !== "number") {
    throw new Error('expected JSON with string "host" and number "port"');
  }
  host = j.host;
  port = j.port;
} catch (e) {
  process.stderr.write(
    `tumiki-mcp-bridge: invalid JSON in ${pathArgFinal}: ${e instanceof Error ? e.message : String(e)}\n`,
  );
  process.exit(1);
}

const socket = connect({ host, port }, () => {
  process.stdin.pipe(socket);
  socket.pipe(process.stdout);
});

const exit = (code: number): void => {
  try {
    socket.destroy();
  } catch {
    /* ignore */
  }
  process.exit(code);
};

process.on("SIGINT", () => exit(0));
process.on("SIGTERM", () => exit(0));

socket.on("error", (err) => {
  process.stderr.write(`tumiki-mcp-bridge: ${err.message}\n`);
  exit(1);
});

socket.on("close", () => exit(0));

if (process.stdin.isPaused()) {
  process.stdin.resume();
}
