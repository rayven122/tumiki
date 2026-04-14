import { useState, useEffect, useCallback, useRef } from "react";
import type { McpServerItem } from "../../main/types";
import type { McpServerState } from "@tumiki/mcp-proxy-core";
import { toast } from "../_components/Toast";

/** ランタイム状態を含むサーバー情報 */
export type McpServerWithRuntime = McpServerItem & {
  /** プロキシから取得したランタイムステータス（nullの場合はDB値を使用） */
  runtimeStatus: McpServerItem["serverStatus"] | null;
  /** ランタイムから取得したツール数 */
  toolCount: number;
};

export const useMcpServers = () => {
  const [servers, setServers] = useState<McpServerWithRuntime[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  // ランタイム状態を保持（リアルタイム更新で利用）
  const runtimeStatesRef = useRef<Map<string, McpServerState>>(new Map());

  /** DB状態とランタイム状態をマージ */
  const mergeStates = useCallback(
    (
      dbServers: McpServerItem[],
      runtimeMap: Map<string, McpServerState>,
    ): McpServerWithRuntime[] =>
      dbServers.map((server) => {
        // サーバーslugでランタイム状態を検索（config名は `{serverSlug}-{connectionSlug}`）
        const matchingStates: McpServerState[] = [];
        for (const [name, state] of runtimeMap) {
          if (name.startsWith(`${server.slug}-`) || name === server.slug) {
            matchingStates.push(state);
          }
        }

        let runtimeStatus: McpServerItem["serverStatus"] | null = null;
        let toolCount = 0;

        if (matchingStates.length > 0) {
          // ランタイム状態からステータスを導出
          const hasRunning = matchingStates.some((s) => s.status === "running");
          const hasError = matchingStates.some((s) => s.status === "error");
          const hasPending = matchingStates.some((s) => s.status === "pending");

          if (hasRunning) runtimeStatus = "RUNNING";
          else if (hasError) runtimeStatus = "ERROR";
          else if (hasPending) runtimeStatus = "PENDING";
          else runtimeStatus = "STOPPED";

          toolCount = matchingStates.reduce(
            (sum, s) => sum + s.tools.length,
            0,
          );
        }

        return {
          ...server,
          // ランタイム状態があればそちらを優先してserverStatusに反映
          serverStatus: runtimeStatus ?? server.serverStatus,
          runtimeStatus,
          toolCount,
        };
      }),
    [],
  );

  /** データを取得してマージ */
  const refresh = useCallback(async () => {
    try {
      const [dbServers, runtimeStates] = await Promise.all([
        window.electronAPI.mcp.getAll(),
        window.electronAPI.mcp.getStatus().catch(() => [] as McpServerState[]),
      ]);

      const runtimeMap = new Map<string, McpServerState>();
      for (const state of runtimeStates) {
        runtimeMap.set(state.name, state);
      }
      runtimeStatesRef.current = runtimeMap;

      setServers(mergeStates(dbServers, runtimeMap));
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, [mergeStates]);

  // 初回ロード
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // リアルタイムステータス更新のsubscribe
  useEffect(() => {
    const unsubscribe = window.electronAPI.mcp.onStatusChanged((state) => {
      runtimeStatesRef.current.set(state.name, {
        name: state.name,
        status: state.status as McpServerState["status"],
        error: state.error,
        tools: runtimeStatesRef.current.get(state.name)?.tools ?? [],
      });

      setServers((prev) =>
        prev.map((server) => {
          const configPrefix = `${server.slug}-`;
          if (
            !state.name.startsWith(configPrefix) &&
            state.name !== server.slug
          ) {
            return server;
          }

          // 該当サーバーのランタイム状態を再計算
          const matchingStates: McpServerState[] = [];
          for (const [name, s] of runtimeStatesRef.current) {
            if (name.startsWith(configPrefix) || name === server.slug) {
              matchingStates.push(s);
            }
          }

          const hasRunning = matchingStates.some((s) => s.status === "running");
          const hasError = matchingStates.some((s) => s.status === "error");
          const hasPending = matchingStates.some((s) => s.status === "pending");

          let runtimeStatus: McpServerItem["serverStatus"];
          if (hasRunning) runtimeStatus = "RUNNING";
          else if (hasError) runtimeStatus = "ERROR";
          else if (hasPending) runtimeStatus = "PENDING";
          else runtimeStatus = "STOPPED";

          return {
            ...server,
            serverStatus: runtimeStatus,
            runtimeStatus,
            toolCount: matchingStates.reduce(
              (sum, s) => sum + s.tools.length,
              0,
            ),
          };
        }),
      );
    });

    return unsubscribe;
  }, []);

  /** 全サーバー起動 */
  const startAll = useCallback(async () => {
    setOperating(true);
    try {
      await window.electronAPI.mcp.start();
      toast.success("MCPサーバーを起動しました");
      await refresh();
    } catch (error) {
      toast.error(
        `起動に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setOperating(false);
    }
  }, [refresh]);

  /** 全サーバー停止 */
  const stopAll = useCallback(async () => {
    setOperating(true);
    try {
      await window.electronAPI.mcp.stop();
      toast.success("MCPサーバーを停止しました");
      await refresh();
    } catch (error) {
      toast.error(
        `停止に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setOperating(false);
    }
  }, [refresh]);

  /** サーバーのenable/disable切り替え */
  const toggleServer = useCallback(
    async (id: number, isEnabled: boolean) => {
      try {
        await window.electronAPI.mcp.toggleServer({ id, isEnabled });
        toast.success(
          isEnabled ? "サーバーを有効化しました" : "サーバーを無効化しました",
        );
        await refresh();
      } catch (error) {
        toast.error(
          `切り替えに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    [refresh],
  );

  /** サーバー削除 */
  const deleteServer = useCallback(
    async (id: number) => {
      try {
        await window.electronAPI.mcp.deleteServer({ id });
        toast.success("サーバーを削除しました");
        await refresh();
      } catch (error) {
        toast.error(
          `削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    [refresh],
  );

  return {
    servers,
    loading,
    operating,
    startAll,
    stopAll,
    toggleServer,
    deleteServer,
    refresh,
  };
};
