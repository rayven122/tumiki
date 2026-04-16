import { useState, useEffect, useCallback, useRef } from "react";
import type { McpServerItem } from "../../main/types";
import { toast } from "../_components/Toast";

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL_MS = 5000;

/** サーバー情報（DB状態ベース） */
export type McpServerWithRuntime = McpServerItem & {
  /** ツール数（接続数で代用） */
  toolCount: number;
};

export const useMcpServers = () => {
  const [servers, setServers] = useState<McpServerWithRuntime[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  /** データを取得 */
  const refresh = useCallback(async () => {
    try {
      const dbServers = await window.electronAPI.mcp.getAll();
      setServers(
        dbServers.map((server) => ({
          ...server,
          toolCount: server.connections.length,
        })),
      );
    } catch (error) {
      // ポーリング中のエラーは初回のみ通知（以降は無音で空配列にフォールバック）
      if (isFirstLoad.current) {
        toast.error(
          `サーバー一覧の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      setServers([]);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  // 初回ロード + 定期ポーリング（CLIモードのステータス変更をDBから反映）
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLLING_INTERVAL_MS);
    return () => clearInterval(timer);
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
    toggleServer,
    deleteServer,
    refresh,
  };
};
