import { useCallback } from "react";
import { toast } from "react-toastify";
import { api } from "@/trpc/react";

type UseReauthenticateOAuthParams = {
  mcpServerId: string;
};

/**
 * OAuth再認証のカスタムフック
 *
 * 既存のMCPサーバーに対してOAuth認証を再実行します。
 */
export const useReauthenticateOAuth = ({
  mcpServerId,
}: UseReauthenticateOAuthParams) => {
  const { mutate: reauthenticate, isPending } =
    api.v2.oauth.reauthenticateMcpServer.useMutation({
      onSuccess: async (response) => {
        toast.info("OAuth認証画面に移動します...");
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleReauthenticate = useCallback(() => {
    reauthenticate({ mcpServerId });
  }, [reauthenticate, mcpServerId]);

  return {
    handleReauthenticate,
    isPending,
  };
};
