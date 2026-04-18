import { useState, useEffect, useCallback, useRef } from "react";
import type { AuditLogListResult } from "../../main/types";
import { toast } from "../_components/Toast";

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL_MS = 5000;

type UseAuditLogsParams = {
  page: number;
  statusFilter: "all" | "success" | "error";
};

export const useAuditLogs = (params: UseAuditLogsParams) => {
  const [result, setResult] = useState<AuditLogListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await window.electronAPI.audit.list({
        page: params.page,
        statusFilter: params.statusFilter,
      });
      setResult(data);
    } catch (error) {
      if (isFirstLoad.current) {
        toast.error(
          `監査ログの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      setResult(null);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [params.page, params.statusFilter]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLLING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { result, loading, refresh };
};
