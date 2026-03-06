import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { api, type RouterOutputs } from "@/trpc/react";

type UseReauthenticateOAuthParams = {
  mcpServerTemplateInstanceId: string;
};

type ReusableToken =
  RouterOutputs["oauth"]["findReusableTokens"]["tokens"][number];

type UseReauthenticateOAuthReturn = {
  /** 再認証を開始（まず再利用可能トークンをチェック） */
  handleReauthenticate: () => Promise<void>;
  /** 新規OAuth認証を実行 */
  handleNewAuthentication: () => void;
  /** ローディング状態 */
  isPending: boolean;
  /** 再利用可能トークンモーダルを表示するか */
  showReuseModal: boolean;
  /** モーダルの開閉を制御 */
  setShowReuseModal: (show: boolean) => void;
  /** 再利用可能なトークン一覧 */
  reusableTokens: ReusableToken[];
  /** ターゲットインスタンスID */
  targetInstanceId: string;
};

/**
 * OAuth再認証のカスタムフック
 *
 * 既存のMCPサーバーに対してOAuth認証を再実行します。
 * 同じテンプレートで認証済みの他のインスタンスがある場合は、
 * トークンの再利用を提案します。
 */
export const useReauthenticateOAuth = ({
  mcpServerTemplateInstanceId,
}: UseReauthenticateOAuthParams): UseReauthenticateOAuthReturn => {
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [reusableTokens, setReusableTokens] = useState<ReusableToken[]>([]);

  // 再利用可能トークンを検索
  const { refetch: fetchReusableTokens, isFetching: isFetchingTokens } =
    api.oauth.findReusableTokens.useQuery(
      { mcpServerTemplateInstanceId },
      {
        enabled: false, // 手動でトリガー
      },
    );

  // 新規OAuth認証
  const { mutate: reauthenticate, isPending: isReauthenticating } =
    api.oauth.reauthenticateMcpServer.useMutation({
      onSuccess: (response) => {
        toast.info("OAuth認証画面に移動します...");
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // 再認証を開始（まず再利用可能トークンをチェック）
  const handleReauthenticate = useCallback(async () => {
    const result = await fetchReusableTokens();

    if (result.data && result.data.tokens.length > 0) {
      // 再利用可能なトークンがある場合はモーダルを表示
      setReusableTokens(result.data.tokens);
      setShowReuseModal(true);
    } else {
      // 再利用可能なトークンがない場合は直接認証
      reauthenticate({ mcpServerTemplateInstanceId });
    }
  }, [fetchReusableTokens, reauthenticate, mcpServerTemplateInstanceId]);

  // 新規認証を実行（モーダルから呼ばれる）
  const handleNewAuthentication = useCallback(() => {
    reauthenticate({ mcpServerTemplateInstanceId });
  }, [reauthenticate, mcpServerTemplateInstanceId]);

  return {
    handleReauthenticate,
    handleNewAuthentication,
    isPending: isFetchingTokens || isReauthenticating,
    showReuseModal,
    setShowReuseModal,
    reusableTokens,
    targetInstanceId: mcpServerTemplateInstanceId,
  };
};
