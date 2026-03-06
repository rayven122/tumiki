import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { McpServerConfig } from "../../domain/types/mcpServer.js";
import {
  ProcessStartError,
  ProcessTimeoutError,
  ProcessNotRunningError,
} from "../../domain/errors/processError.js";
import { logInfo, logError, logDebug } from "../../shared/logger/index.js";
import { config } from "../../shared/constants/config.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../shared/types/jsonRpc.js";

type ProcessStatus = "starting" | "ready" | "busy" | "stopping" | "stopped";

type PendingRequest = {
  resolve: (response: JsonRpcResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

/**
 * MCPプロセス管理クラス
 *
 * stdio経由でMCPサーバープロセスと通信する
 */
export class McpProcess {
  readonly serverName: string;
  private serverConfig: McpServerConfig;
  private env: Record<string, string>;
  private process: ChildProcess | null = null;
  private status: ProcessStatus = "stopped";
  private pendingRequests = new Map<string | number, PendingRequest>();
  private buffer = "";

  lastUsedAt: number = Date.now();

  constructor(serverConfig: McpServerConfig, env: Record<string, string>) {
    this.serverName = serverConfig.normalizedName;
    this.serverConfig = serverConfig;
    this.env = env;
  }

  /**
   * プロセスを起動
   */
  async spawn(): Promise<void> {
    this.status = "starting";

    const { command, args } = this.serverConfig;

    logInfo("Spawning MCP process", {
      serverName: this.serverName,
      command,
      args,
    });

    this.process = spawn(command, [...args], {
      env: { ...process.env, ...this.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // stdoutからJSON-RPCレスポンスを読み取り
    this.process.stdout?.on("data", (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    // stderrをログ出力
    this.process.stderr?.on("data", (data: Buffer) => {
      logDebug(`[${this.serverName}] stderr`, { output: data.toString() });
    });

    this.process.on("exit", (code) => {
      logInfo("MCP process exited", { serverName: this.serverName, code });
      this.status = "stopped";
      // 未解決のリクエストをreject
      for (const { reject, timeout } of this.pendingRequests.values()) {
        clearTimeout(timeout);
        reject(new Error(`Process exited with code ${code}`));
      }
      this.pendingRequests.clear();
    });

    this.process.on("error", (err) => {
      this.status = "stopped";
      throw new ProcessStartError(this.serverName, err.message);
    });

    // initializeリクエストで準備完了を確認
    await this.initialize();
    this.status = "ready";
    logInfo("MCP process ready", { serverName: this.serverName });
  }

  /**
   * MCPサーバーを初期化
   */
  private async initialize(): Promise<void> {
    const initRequest: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "tumiki-mcp-wrapper", version: "1.0.0" },
      },
    };

    await this.sendRequest(initRequest);

    // initialized通知を送信
    this.writeToStdin({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
  }

  /**
   * JSON-RPCリクエストを送信
   */
  async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.process || this.status === "stopped") {
      throw new ProcessNotRunningError(this.serverName);
    }

    this.touch();

    const id = request.id ?? randomUUID();
    const requestWithId = { ...request, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new ProcessTimeoutError(this.serverName));
      }, config.requestTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.writeToStdin(requestWithId);
    });
  }

  /**
   * stdoutバッファを処理
   */
  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        if (response.id !== undefined && response.id !== null) {
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            pending.resolve(response);
          }
        }
      } catch {
        logError(`[${this.serverName}] Invalid JSON`, new Error(line));
      }
    }
  }

  /**
   * stdinに書き込み
   */
  private writeToStdin(data: unknown): void {
    this.process?.stdin?.write(JSON.stringify(data) + "\n");
  }

  /**
   * 最終使用時刻を更新
   */
  touch(): void {
    this.lastUsedAt = Date.now();
  }

  isAlive(): boolean {
    return this.status === "ready" || this.status === "busy";
  }

  isBusy(): boolean {
    return this.pendingRequests.size > 0;
  }

  getStatus(): ProcessStatus {
    return this.status;
  }

  /**
   * プロセスを終了
   */
  async kill(): Promise<void> {
    if (this.process && this.status !== "stopped") {
      logInfo("Killing MCP process", { serverName: this.serverName });
      this.status = "stopping";
      this.process.kill("SIGTERM");

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 3000);

        this.process?.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.status = "stopped";
    }
  }
}
