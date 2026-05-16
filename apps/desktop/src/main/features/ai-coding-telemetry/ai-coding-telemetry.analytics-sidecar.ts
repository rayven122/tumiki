import type { Server } from "node:http";
import * as logger from "../../shared/utils/logger";
import {
  OTLP_DEFAULT_PORT,
  startOtlpReceiver,
} from "./ai-coding-telemetry.receiver";

type JsonRpcMessage = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

type AnalyticsSidecarRuntime = {
  receiverStarted: boolean;
  server: Server | null;
};

const isAddressInUseError = (error: unknown): boolean =>
  error instanceof Error &&
  (error as NodeJS.ErrnoException).code === "EADDRINUSE";

export const startAnalyticsReceiverSingleton =
  async (): Promise<AnalyticsSidecarRuntime> => {
    try {
      const { server } = await startOtlpReceiver(OTLP_DEFAULT_PORT, {
        allowFallback: false,
      });
      process.stderr.write(
        `[tumiki-analytics] OTLP receiver started on 127.0.0.1:${String(OTLP_DEFAULT_PORT)}\n`,
      );
      return { receiverStarted: true, server };
    } catch (error) {
      if (isAddressInUseError(error)) {
        process.stderr.write(
          `[tumiki-analytics] OTLP receiver already running on 127.0.0.1:${String(OTLP_DEFAULT_PORT)}\n`,
        );
        return { receiverStarted: false, server: null };
      }
      throw error;
    }
  };

const writeMessage = (message: unknown): void => {
  const body = JSON.stringify(message);
  process.stdout.write(
    `Content-Length: ${String(Buffer.byteLength(body, "utf8"))}\r\n\r\n${body}`,
  );
};

const writeResult = (id: string | number | null, result: unknown): void => {
  if (id === undefined) return;
  writeMessage({ jsonrpc: "2.0", id, result });
};

const writeError = (
  id: string | number | null,
  code: number,
  message: string,
): void => {
  if (id === undefined) return;
  writeMessage({ jsonrpc: "2.0", id, error: { code, message } });
};

const handleRequest = (
  message: JsonRpcMessage,
  runtime: AnalyticsSidecarRuntime,
): void => {
  const id = message.id;
  if (id === undefined) return;

  switch (message.method) {
    case "initialize":
      writeResult(id, {
        protocolVersion:
          typeof message.params === "object" &&
          message.params !== null &&
          "protocolVersion" in message.params &&
          typeof (message.params as { protocolVersion?: unknown })
            .protocolVersion === "string"
            ? (message.params as { protocolVersion: string }).protocolVersion
            : "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "tumiki-analytics",
          version: "0.1.0",
        },
      });
      return;
    case "ping":
      writeResult(id, {});
      return;
    case "tools/list":
      writeResult(id, { tools: [] });
      return;
    case "resources/list":
      writeResult(id, { resources: [] });
      return;
    case "prompts/list":
      writeResult(id, { prompts: [] });
      return;
    case "tumiki/analytics/status":
      writeResult(id, {
        port: OTLP_DEFAULT_PORT,
        receiverStarted: runtime.receiverStarted,
        listening: true,
      });
      return;
    default:
      writeError(id, -32601, `Method not found: ${message.method ?? ""}`);
  }
};

const extractContentLength = (headers: string): number | null => {
  for (const line of headers.split(/\r?\n/)) {
    const match = /^content-length:\s*(\d+)$/i.exec(line.trim());
    if (match) return Number(match[1]);
  }
  return null;
};

export const startAnalyticsMcpServer = (
  runtime: AnalyticsSidecarRuntime,
): void => {
  let buffer = Buffer.alloc(0);

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const headers = buffer.subarray(0, headerEnd).toString("utf8");
      const contentLength = extractContentLength(headers);
      if (!contentLength || contentLength < 0) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }

      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;
      if (buffer.length < messageEnd) return;

      const body = buffer.subarray(messageStart, messageEnd).toString("utf8");
      buffer = buffer.subarray(messageEnd);

      try {
        const parsed = JSON.parse(body) as JsonRpcMessage;
        handleRequest(parsed, runtime);
      } catch (error) {
        logger.warn("Failed to parse analytics MCP request", { error });
        writeError(null, -32700, "Parse error");
      }
    }
  });
};
