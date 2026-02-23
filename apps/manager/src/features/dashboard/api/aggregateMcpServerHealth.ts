import type { z } from "zod";
import type { McpServerHealthItemSchema } from "./schemas";

// 集計関数の入力型
type McpServerInput = {
  id: string;
  name: string;
  slug: string;
  iconPath: string | null;
  serverStatus: "RUNNING" | "STOPPED" | "ERROR" | "PENDING";
  templateInstances: {
    mcpServerTemplate: {
      iconPath: string | null;
    } | null;
  }[];
};

type RequestLogInput = {
  mcpServerId: string;
  httpStatus: number;
  durationMs: number;
};

type McpServerHealthItem = z.infer<typeof McpServerHealthItemSchema>;

/**
 * MCPサーバー別のヘルスメトリクスを集計する純粋関数
 *
 * - リクエストゼロのサーバーも結果に含める（requestCount=0, errorRate=0, avgDurationMs=null）
 * - errorCountはhttpStatus >= 400のログ数
 * - errorRateは小数点1桁で丸める
 * - iconPathはサーバー直接指定 → テンプレートインスタンスの順でフォールバック
 */
export const aggregateMcpServerHealth = (
  servers: McpServerInput[],
  requestLogs: RequestLogInput[],
): McpServerHealthItem[] => {
  // mcpServerIdごとにログをグルーピング
  const logsByServer = new Map<string, RequestLogInput[]>();
  for (const log of requestLogs) {
    const existing = logsByServer.get(log.mcpServerId);
    if (existing) {
      existing.push(log);
    } else {
      logsByServer.set(log.mcpServerId, [log]);
    }
  }

  return servers.map((server) => {
    const logs = logsByServer.get(server.id) ?? [];
    const iconPath =
      server.iconPath ??
      server.templateInstances[0]?.mcpServerTemplate?.iconPath ??
      null;

    if (logs.length === 0) {
      return {
        mcpServerId: server.id,
        name: server.name,
        slug: server.slug,
        iconPath,
        serverStatus: server.serverStatus,
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        avgDurationMs: null,
      };
    }

    const errorCount = logs.filter((l) => l.httpStatus >= 400).length;
    const errorRate = Math.round((errorCount / logs.length) * 1000) / 10;

    const avgDurationMs = Math.round(
      logs.reduce((sum, l) => sum + l.durationMs, 0) / logs.length,
    );

    return {
      mcpServerId: server.id,
      name: server.name,
      slug: server.slug,
      iconPath,
      serverStatus: server.serverStatus,
      requestCount: logs.length,
      errorCount,
      errorRate,
      avgDurationMs,
    };
  });
};
