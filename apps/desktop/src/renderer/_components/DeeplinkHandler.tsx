import { useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "./Toast";

/**
 * main プロセスからのディープリンク（AI クライアントが踏む `tumiki://reauth?...`）を受け取り、
 * 対象サーバーの詳細画面へ遷移する + main 側で並行起動された OAuth フローの結果トーストを出す。
 *
 * 通常 IPC 経由の reauth（OAuthReauthModal から）は呼び出し元コンポーネントが try/catch で
 * トーストするため、ここで二重トーストにならないよう「ディープリンク発火中のみ」フラグで
 * 結果ブロードキャストを受け取る。
 *
 * HashRouter 配下に配置する必要がある（useNavigate を使うため）。
 */
export const DeeplinkHandler = (): JSX.Element | null => {
  const navigate = useNavigate();
  const deeplinkInFlight = useRef(false);

  useEffect(() => {
    const unsubscribeNav = window.electronAPI.mcp.onReauthDeeplink(
      ({ serverId }) => {
        deeplinkInFlight.current = true;
        navigate(`/tools/${String(serverId)}`);
        toast.success(
          "OAuth再認証ブラウザを起動しました。認証完了後にこの画面へ戻ってください",
        );
      },
    );
    // ディープリンク経由の OAuth フローのみ結果を拾う（通常 UI 経由は呼び出し元がトースト済み）
    const unsubscribeSuccess = window.electronAPI.oauth.onReauthSuccess(() => {
      if (!deeplinkInFlight.current) return;
      deeplinkInFlight.current = false;
      toast.success(
        "OAuth再認証が完了しました。MCPサーバーの再起動後に新トークンが反映されます",
      );
    });
    const unsubscribeError = window.electronAPI.oauth.onReauthError((error) => {
      if (!deeplinkInFlight.current) return;
      deeplinkInFlight.current = false;
      toast.error(error);
    });
    return () => {
      unsubscribeNav();
      unsubscribeSuccess();
      unsubscribeError();
    };
  }, [navigate]);

  return null;
};
