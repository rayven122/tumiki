import { McpProcess } from "./mcpProcess.js";
import type { McpServerConfig } from "../../domain/types/mcpServer.js";
import { createProcessKey } from "../../domain/values/processKey.js";
import { logInfo, logWarn } from "../../shared/logger/index.js";
import { config } from "../../shared/constants/config.js";

/**
 * プロセスプール状態
 */
export type ProcessPoolStatus = {
  size: number;
  maxSize: number;
  processes: {
    name: string;
    status: string;
    lastUsedAt: number;
  }[];
};

/**
 * プロセスプール管理クラス
 *
 * 最大N個のMCPプロセスを管理し、LRU evictionとアイドルタイムアウトを実装
 */
export class ProcessPool {
  private processes = new Map<string, McpProcess>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * プロセスを取得または作成
   */
  async getOrCreate(
    serverConfig: McpServerConfig,
    env: Record<string, string>,
  ): Promise<McpProcess> {
    const processKey = createProcessKey(serverConfig.normalizedName, env);

    // 既存プロセスがあれば再利用
    const existing = this.processes.get(processKey.value);
    if (existing?.isAlive()) {
      logInfo("Reusing existing MCP process", {
        serverName: serverConfig.normalizedName,
        processKey: processKey.value,
      });
      existing.touch();
      return existing;
    }

    // プール満杯なら古いプロセスを削除
    if (this.processes.size >= config.maxProcesses) {
      const evicted = await this.evictLRU();
      if (!evicted) {
        throw new Error(
          `Process pool is full (${config.maxProcesses}). All processes are busy.`,
        );
      }
    }

    // 新規プロセス起動
    logInfo("Starting new MCP process", {
      serverName: serverConfig.normalizedName,
      processKey: processKey.value,
    });

    const mcpProcess = new McpProcess(serverConfig, env);
    await mcpProcess.spawn();
    this.processes.set(processKey.value, mcpProcess);

    return mcpProcess;
  }

  /**
   * 最も古い未使用プロセスを削除（LRU）
   * @returns 削除できた場合はtrue、全プロセスがビジーで削除できなかった場合はfalse
   */
  private async evictLRU(): Promise<boolean> {
    let oldest: { key: string; process: McpProcess } | null = null;

    for (const [key, mcpProcess] of this.processes) {
      if (!mcpProcess.isBusy()) {
        if (!oldest || mcpProcess.lastUsedAt < oldest.process.lastUsedAt) {
          oldest = { key, process: mcpProcess };
        }
      }
    }

    if (oldest) {
      logInfo("Evicting LRU process", {
        key: oldest.key,
        serverName: oldest.process.serverName,
      });
      await oldest.process.kill();
      this.processes.delete(oldest.key);
      return true;
    } else {
      logWarn("Cannot evict: all processes are busy");
      return false;
    }
  }

  /**
   * アイドルプロセスのクリーンアップ
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(
      () => {
        void this.cleanupIdleProcesses();
      },
      60 * 1000,
    ); // 1分ごとにチェック
  }

  private async cleanupIdleProcesses(): Promise<void> {
    const now = Date.now();
    const toCleanup: { key: string; process: McpProcess }[] = [];

    for (const [key, mcpProcess] of this.processes) {
      if (
        now - mcpProcess.lastUsedAt > config.idleTimeoutMs &&
        !mcpProcess.isBusy()
      ) {
        toCleanup.push({ key, process: mcpProcess });
      }
    }

    for (const { key, process: mcpProcess } of toCleanup) {
      logInfo("Cleaning up idle process", {
        key,
        serverName: mcpProcess.serverName,
      });
      await mcpProcess.kill();
      this.processes.delete(key);
    }
  }

  /**
   * プール状態を取得
   */
  getStatus(): ProcessPoolStatus {
    return {
      size: this.processes.size,
      maxSize: config.maxProcesses,
      processes: Array.from(this.processes.values()).map((p) => ({
        name: p.serverName,
        status: p.getStatus(),
        lastUsedAt: p.lastUsedAt,
      })),
    };
  }

  /**
   * シャットダウン
   */
  async shutdown(): Promise<void> {
    logInfo("Shutting down process pool", { size: this.processes.size });

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const promises = Array.from(this.processes.values()).map((p) => p.kill());
    await Promise.all(promises);
    this.processes.clear();

    logInfo("Process pool shutdown complete");
  }
}

// シングルトンインスタンス（本番用）
let _instance: ProcessPool | null = null;

export const getProcessPool = (): ProcessPool => {
  if (!_instance) {
    _instance = new ProcessPool();
  }
  return _instance;
};

// テスト用: 新しいインスタンスを作成
export const createProcessPool = (): ProcessPool => {
  return new ProcessPool();
};

// 後方互換性のためのエクスポート
export const processPool = getProcessPool();
