import type { Server } from "node:http";
import { isAddressInUseError } from "../../shared/utils/error";
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

type JsonRpcId = NonNullable<JsonRpcMessage["id"]> | null;

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

type AnalyticsSidecarRuntime = {
  receiverStarted: boolean;
  receiverListening: boolean;
  server: Server | null;
};

const extractProtocolVersion = (params: unknown): string => {
  if (typeof params !== "object" || params === null) return "2024-11-05";
  const values = params as Record<string, unknown>;
  return typeof values.protocolVersion === "string"
    ? values.protocolVersion
    : "2024-11-05";
};

export const startAnalyticsReceiverSingleton =
  async (): Promise<AnalyticsSidecarRuntime> => {
    try {
      const { server } = await startOtlpReceiver(OTLP_DEFAULT_PORT, {
        allowFallback: false,
      });
      process.stderr.write(
        `[tumiki-analytics] OTLP receiver started on 127.0.0.1:${String(OTLP_DEFAULT_PORT)}\n`,
      );
      return { receiverStarted: true, receiverListening: true, server };
    } catch (error) {
      if (isAddressInUseError(error)) {
        process.stderr.write(
          `[tumiki-analytics] OTLP receiver already running on 127.0.0.1:${String(OTLP_DEFAULT_PORT)}\n`,
        );
        return {
          receiverStarted: false,
          receiverListening: true,
          server: null,
        };
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

const writeError = (id: JsonRpcId, code: number, message: string): void => {
  writeMessage({ jsonrpc: "2.0", id, error: { code, message } });
};

export const createAnalyticsMcpResponse = (
  message: JsonRpcMessage,
  runtime: AnalyticsSidecarRuntime,
): JsonRpcResponse | null => {
  const id = message.id;
  if (id === undefined) return null;

  switch (message.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: extractProtocolVersion(message.params),
          capabilities: { tools: {} },
          serverInfo: {
            name: "tumiki-analytics",
            version: "0.1.0",
          },
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: [] } };
    case "resources/list":
      return { jsonrpc: "2.0", id, result: { resources: [] } };
    case "prompts/list":
      return { jsonrpc: "2.0", id, result: { prompts: [] } };
    case "tumiki/analytics/status":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          port: OTLP_DEFAULT_PORT,
          receiverStarted: runtime.receiverStarted,
          listening: runtime.receiverListening,
        },
      };
    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method ?? ""}`,
        },
      };
  }
};

const handleRequest = (
  message: JsonRpcMessage,
  runtime: AnalyticsSidecarRuntime,
): void => {
  const response = createAnalyticsMcpResponse(message, runtime);
  if (response !== null) writeMessage(response);
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
      if (contentLength === null || contentLength <= 0) {
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
