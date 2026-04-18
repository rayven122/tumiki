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

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const data = await window.electronAPI.audit.list({
          page: params.page,
          statusFilter: params.statusFilter,
        });
        if (!cancelled) {
          setResult(data);
        }
      } catch (error) {
        if (cancelled) return;
        if (isFirstLoad.current) {
          toast.error(
            `監査ログの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        // ポーリング失敗時は前回データを保持（初回のみnull）
        if (isFirstLoad.current) {
          setResult(null);
        }
      } finally {
        if (!cancelled && isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    };

    void fetch();
    const timer = setInterval(() => void fetch(), POLLING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [params.page, params.statusFilter]);

  const refresh = useCallback(() => {
    return window.electronAPI.audit
      .list({
        page: params.page,
        statusFilter: params.statusFilter,
      })
      .then(setResult)
      .catch(() => undefined);
  }, [params.page, params.statusFilter]);

  return { result, loading, refresh };
};
