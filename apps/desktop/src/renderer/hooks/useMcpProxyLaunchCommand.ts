import { useEffect, useState } from "react";
import type { McpProxyLaunchCommand } from "../../main/types";

// MCP プロキシ起動コマンド（接続スニペット生成に利用）を main から1度だけ取得して保持する
export const useMcpProxyLaunchCommand = (): McpProxyLaunchCommand | null => {
  const [launchCommand, setLaunchCommand] =
    useState<McpProxyLaunchCommand | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.mcpProxy.getLaunchCommand().then(
      (result) => {
        if (!cancelled) setLaunchCommand(result);
      },
      () => {
        // 取得失敗時は null のまま（呼び出し側でフォールバック表示する想定）
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return launchCommand;
};
