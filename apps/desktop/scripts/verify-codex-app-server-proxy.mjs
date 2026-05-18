#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "../..");
const fixturePath = path.join(
  desktopRoot,
  "tests/fixtures/codex-app-server-fixture.mjs",
);
const coreProxyDistPath = path.join(
  repoRoot,
  "packages/mcp-core-proxy/dist/cli.js",
);
const userCodexConfigPath = path.join(homedir(), ".codex/config.toml");
const DEFAULT_TIMEOUT_MS = 20_000;
const REQUIRED_RUNTIME_PACKAGES = [
  "@iarna/toml",
  "@modelcontextprotocol/sdk/server/index.js",
  "@toon-format/toon",
  "openredaction",
];

const parseArgs = (argv) => {
  const config = {
    timeoutMs: Number.parseInt(
      process.env.CODEX_APP_SERVER_VERIFY_TIMEOUT_MS ?? "",
      10,
    ),
    keepTemp: process.env.CODEX_APP_SERVER_VERIFY_KEEP_TEMP === "1",
    skipBuild: process.env.CODEX_APP_SERVER_VERIFY_SKIP_BUILD === "1",
  };
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs <= 0) {
    config.timeoutMs = DEFAULT_TIMEOUT_MS;
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--timeout-ms" && next) {
      const value = Number.parseInt(next, 10);
      if (Number.isInteger(value) && value > 0) config.timeoutMs = value;
      index += 1;
    } else if (arg === "--keep-temp") {
      config.keepTemp = true;
    } else if (arg === "--skip-build") {
      config.skipBuild = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return config;
};

const printHelp = () => {
  console.log(`Usage: pnpm --filter @tumiki/desktop verify:codex-app-server-proxy [options]

Options:
  --timeout-ms 20000   Timeout for each JSON-RPC response.
  --skip-build         Require packages/mcp-core-proxy/dist/cli.js to exist.
  --keep-temp          Keep the temporary HOME/Codex config for inspection.

The script writes Codex config only under a temporary HOME and never modifies
the user's ~/.codex/config.toml.
`);
};

const sha256File = (filePath) => {
  if (!existsSync(filePath)) return null;
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
};

const statSnapshot = (filePath) => {
  if (!existsSync(filePath)) return null;
  const stat = statSync(filePath);
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    sha256: sha256File(filePath),
  };
};

const assertRuntimePackagesInstalled = () => {
  const missing = REQUIRED_RUNTIME_PACKAGES.filter((packageName) => {
    try {
      require.resolve(packageName, {
        paths: [desktopRoot, path.join(repoRoot, "packages/mcp-core-proxy")],
      });
      return false;
    } catch {
      return true;
    }
  });
  if (missing.length === 0) return;
  throw new Error(
    `Missing runtime packages for the Codex app-server proxy verifier: ${missing.join(
      ", ",
    )}. Run pnpm install before this verification script.`,
  );
};

const ensureBuiltCoreProxy = async (skipBuild) => {
  if (existsSync(coreProxyDistPath)) return { built: false };
  if (skipBuild) {
    throw new Error(
      `${coreProxyDistPath} does not exist. Run pnpm --filter @tumiki/mcp-core-proxy build first or omit --skip-build.`,
    );
  }
  await runCommand("pnpm", ["--filter", "@tumiki/mcp-core-proxy", "build"], {
    cwd: repoRoot,
  });
  if (!existsSync(coreProxyDistPath)) {
    throw new Error(`Build completed but ${coreProxyDistPath} was not created`);
  }
  return { built: true };
};

const runCommand = (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with code=${String(
              code,
            )} signal=${String(signal)}\n${stderr || stdout}`,
          ),
        );
      }
    });
  });

const jsonRpcFrame = (payload) =>
  Buffer.from(`${JSON.stringify(payload)}\n`, "utf-8");

class JsonRpcSession {
  constructor(child, timeoutMs) {
    this.child = child;
    this.timeoutMs = timeoutMs;
    this.buffer = "";
    this.pending = new Map();
    this.stderr = "";
    child.stdout.on("data", (chunk) => this.onStdout(chunk));
    child.stderr.on("data", (chunk) => {
      this.stderr += chunk.toString("utf-8");
    });
    child.on("close", (code, signal) => {
      const error = new Error(
        `proxy process exited code=${String(code)} signal=${String(signal)}\n${this.stderr}`,
      );
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  onStdout(chunk) {
    this.buffer += chunk.toString("utf-8");
    while (true) {
      const newlineIndex = this.buffer.indexOf("\n");
      if (newlineIndex === -1) return;
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        clearTimeout(pending.timeout);
        pending.resolve(message);
      }
    }
  }

  request(payload) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(payload.id);
        reject(
          new Error(
            `Timed out waiting for ${payload.method} response after ${this.timeoutMs}ms\n${this.stderr}`,
          ),
        );
      }, this.timeoutMs);
      this.pending.set(payload.id, { resolve, reject, timeout });
      this.child.stdin.write(jsonRpcFrame(payload));
    });
  }

  notify(payload) {
    this.child.stdin.write(jsonRpcFrame(payload));
  }

  close() {
    this.child.stdin.end();
  }
}

const assertNoJsonRpcError = (label, response) => {
  if (response.error) {
    throw new Error(
      `${label} returned JSON-RPC error: ${JSON.stringify(response.error)}`,
    );
  }
  if (!response.result) {
    throw new Error(`${label} returned no result: ${JSON.stringify(response)}`);
  }
  return response.result;
};

const createTempConfig = async (tempRoot, runnerPath) => {
  const codexDir = path.join(tempRoot, ".codex");
  mkdirSync(codexDir, { recursive: true });
  const configPath = path.join(codexDir, "config.toml");
  const configText = `[mcp_servers.tumiki-app-server-proxy]
command = "${process.execPath.replaceAll("\\", "\\\\")}"
args = ["${runnerPath.replaceAll("\\", "\\\\")}"]
`;
  await writeFile(configPath, configText, "utf-8");
  return configPath;
};

const createRunner = async (tempRoot) => {
  const runnerPath = path.join(tempRoot, "tumiki-codex-app-server-runner.mjs");
  const runnerSource = `import { runMcpProxy } from ${JSON.stringify(
    pathToFileURL(coreProxyDistPath).href,
  )};

await runMcpProxy(
  [
    {
      name: "fixture",
      transportType: "STDIO",
      command: process.execPath,
      args: [${JSON.stringify(fixturePath)}],
      env: {},
      allowedTools: ["echo"],
    },
  ],
  {
    disableDefaultFilter: true,
    dynamicSearch: {
      enabled: true,
      provider: {
        searchTools: async ({ query, limit }) =>
          query.toLowerCase().includes("echo")
            ? [
                {
                  toolName: "fixture__echo",
                  description: "Echo text from a fixture MCP server.",
                  relevanceScore: 1,
                },
              ].slice(0, limit ?? 10)
            : [],
        describeTools: async ({ toolNames }) =>
          toolNames.map((toolName) =>
            toolName === "fixture__echo"
              ? {
                  toolName,
                  description: "Echo text from a fixture MCP server.",
                  inputSchema: {
                    type: "object",
                    properties: { text: { type: "string" } },
                    required: ["text"],
                  },
                  found: true,
                }
              : { toolName, inputSchema: {}, found: false },
          ),
      },
    },
  },
);
`;
  await writeFile(runnerPath, runnerSource, "utf-8");
  return runnerPath;
};

const runJsonRpcFlow = async ({ runnerPath, tempRoot, timeoutMs }) => {
  const child = spawn(process.execPath, [runnerPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: tempRoot,
      CODEX_HOME: path.join(tempRoot, ".codex"),
      XDG_CONFIG_HOME: path.join(tempRoot, ".config"),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const session = new JsonRpcSession(child, timeoutMs);
  try {
    const initialize = assertNoJsonRpcError(
      "initialize",
      await session.request({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "codex-app-server-verifier",
            version: "0.1.0",
          },
        },
      }),
    );

    session.notify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    });

    const listed = assertNoJsonRpcError(
      "tools/list",
      await session.request({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    );
    const toolNames = listed.tools.map((tool) => tool.name);
    const expectedMetaTools = [
      "search_tools",
      "describe_tools",
      "execute_tool",
    ];
    if (toolNames.join(",") !== expectedMetaTools.join(",")) {
      throw new Error(
        `Expected only dynamic search meta tools, got ${toolNames.join(", ")}`,
      );
    }

    const searched = assertNoJsonRpcError(
      "search_tools",
      await session.request({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "search_tools",
          arguments: { query: "echo text", limit: 5 },
        },
      }),
    );
    const searchResults = JSON.parse(searched.content?.[0]?.text ?? "[]");
    if (searchResults[0]?.toolName !== "fixture__echo") {
      throw new Error(
        `Unexpected search_tools result: ${JSON.stringify(searchResults)}`,
      );
    }

    const described = assertNoJsonRpcError(
      "describe_tools",
      await session.request({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "describe_tools",
          arguments: { toolNames: ["fixture__echo"] },
        },
      }),
    );
    const descriptions = JSON.parse(described.content?.[0]?.text ?? "[]");
    if (descriptions[0]?.found !== true) {
      throw new Error(
        `Unexpected describe_tools result: ${JSON.stringify(descriptions)}`,
      );
    }

    const called = assertNoJsonRpcError(
      "execute_tool",
      await session.request({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "execute_tool",
          arguments: {
            name: "fixture__echo",
            arguments: { text: "codex-proxy-ok" },
          },
        },
      }),
    );
    const text = called.content?.[0]?.text;
    if (text !== "echo:codex-proxy-ok") {
      throw new Error(`Unexpected execute_tool text: ${JSON.stringify(text)}`);
    }

    return {
      initializeProtocolVersion: initialize.protocolVersion,
      tools: toolNames,
      searchResults,
      descriptions,
      callText: text,
      stderr: session.stderr.trim(),
    };
  } finally {
    session.close();
    setTimeout(() => {
      if (!child.killed) child.kill("SIGTERM");
    }, 500).unref();
  }
};

const main = async () => {
  const config = parseArgs(process.argv.slice(2));
  const beforeUserConfig = statSnapshot(userCodexConfigPath);
  assertRuntimePackagesInstalled();
  const build = await ensureBuiltCoreProxy(config.skipBuild);
  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "tumiki-codex-app-server-"),
  );
  const runnerPath = await createRunner(tempRoot);
  const tempConfigPath = await createTempConfig(tempRoot, runnerPath);

  let flowResult;
  try {
    flowResult = await runJsonRpcFlow({
      runnerPath,
      tempRoot,
      timeoutMs: config.timeoutMs,
    });
  } finally {
    if (!config.keepTemp) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  const afterUserConfig = statSnapshot(userCodexConfigPath);
  const userConfigUnchanged =
    JSON.stringify(beforeUserConfig) === JSON.stringify(afterUserConfig);
  if (!userConfigUnchanged) {
    throw new Error(`${userCodexConfigPath} changed during verification`);
  }

  const summary = {
    ok: true,
    builtCoreProxy: build.built,
    userConfigPath: userCodexConfigPath,
    userConfigUnchanged,
    tempConfigPath,
    tempConfigKept: config.keepTemp,
    flow: flowResult,
  };

  writeFileSync(1, `${JSON.stringify(summary, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
