/**
 * チャット画面からのOAuth再認証フック
 *
 * MCPツール実行時に401エラーが発生した場合、
 * チャット画面から離れずに再認証フローを開始するためのフック
 */
import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "react-toastify";

type UseReauthenticateFromChatParams = {
  /** 認証完了後に戻るURL（例: /org-slug/chat/chat-id） */
  redirectTo: string;
};

type UseReauthenticateFromChatReturn = {
  /** 再認証を開始する関数（mcpServerIdを渡す） */
  startReauthentication: (mcpServerId: string) => void;
  /** 再認証処理中かどうか */
  isPending: boolean;
};

/**
 * チャット画面からのOAuth再認証フック
 *
 * @example
 * ```tsx
 * const { startReauthentication, isPending } = useReauthenticateFromChat({
 *   redirectTo: `/${orgSlug}/chat/${chatId}`,
 * });
 *
 * // 再認証ボタンのクリックハンドラ
 * <button onClick={() => startReauthentication(mcpServerId)} disabled={isPending}>
 *   再認証する
 * </button>
 * ```
 */
export const useReauthenticateFromChat = ({
  redirectTo,
}: UseReauthenticateFromChatParams): UseReauthenticateFromChatReturn => {
  const [isPending, setIsPending] = useState(false);

  const { mutate: reauthenticate } =
    api.oauth.reauthenticateByMcpServerId.useMutation({
      onMutate: () => {
        setIsPending(true);
      },
      onSuccess: (response) => {
        toast.info("OAuth認証画面に移動します...");
        // 認証完了後にチャット画面に戻る
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        setIsPending(false);
        toast.error(`再認証に失敗しました: ${error.message}`);
      },
    });

  const startReauthentication = useCallback(
    (mcpServerId: string) => {
      reauthenticate({
        mcpServerId,
        redirectTo,
      });
    },
    [reauthenticate, redirectTo],
  );

  return {
    startReauthentication,
    isPending,
  };
};
