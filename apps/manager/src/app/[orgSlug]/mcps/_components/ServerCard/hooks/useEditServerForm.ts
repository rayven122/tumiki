import { useCallback } from "react";
import { toast } from "react-toastify";
import type { Prisma } from "@tumiki/db/prisma";
import { api } from "@/trpc/react";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

/**
 * MCPサーバー編集フォームのパラメータ
 */
type UseEditServerFormParams = {
  /** MCPサーバーテンプレート */
  mcpServer: McpServerTemplate;
  /** ユーザーMCPサーバーID */
  userMcpServerId: string;
  /** サーバー更新成功時のコールバック関数 */
  onSuccess: () => void;
};

/**
 * MCPサーバー編集フォームのカスタムフック
 *
 * 既存のMCPサーバーの設定を更新します。
 * OAuth認証とAPIキー認証の両方の更新に対応します。
 *
 * @param params - フックのパラメータ
 * @param params.mcpServer - MCPサーバーテンプレート
 * @param params.userMcpServerId - 更新対象のユーザーMCPサーバーID
 * @param params.onSuccess - サーバー更新成功時のコールバック
 * @returns サーバー編集に必要な状態とハンドラー関数
 */
export const useEditServerForm = ({
  mcpServer,
  userMcpServerId,
  onSuccess,
}: UseEditServerFormParams) => {
  const utils = api.useUtils();

  // APIキー認証MCPサーバー更新（v2 APIを使用）
  const { mutate: updateApiKeyMcpServer, isPending: isUpdating } =
    api.userMcpServer.update.useMutation({
      onSuccess: async () => {
        toast.success(`${mcpServer.name}のAPIトークンが正常に更新されました。`);
        await utils.userMcpServer.invalidate();
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // OAuth認証MCPサーバー更新（v2 APIを使用、実質は再認証のため新規接続）
  const { mutate: updateOAuthMcpServer, isPending: isOAuthConnecting } =
    api.oauth.connectMcpServer.useMutation({
      onSuccess: async (response) => {
        // OAuth認証画面にリダイレクト
        toast.info("OAuth認証画面に移動します...");
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  /**
   * OAuth認証フローを開始する（再認証用）
   *
   * 新しいMCPサーバーを作成し、OAuth認証が必要な場合は認証URLにリダイレクトします。
   * OAuthプロバイダーとスコープはDCRから取得されます。
   *
   * @param serverName - サーバー名
   */
  const handleOAuthConnect = useCallback(
    (serverName: string, slug: string) => {
      updateOAuthMcpServer({
        templateId: mcpServer.id,
        name: serverName || mcpServer.name,
        slug: slug,
      });
    },
    [mcpServer.id, mcpServer.name, updateOAuthMcpServer],
  );

  /**
   * APIキーを使用してMCPサーバーの設定を更新する
   *
   * @param envVars - 更新する環境変数（APIキーなど）
   */
  const handleUpdateWithApiKey = useCallback(
    (envVars: Record<string, string>) => {
      updateApiKeyMcpServer({
        id: userMcpServerId,
        envVars,
      });
    },
    [userMcpServerId, updateApiKeyMcpServer],
  );

  return {
    /** 処理中かどうか（OAuth認証またはサーバー更新） */
    isPending: isOAuthConnecting || isUpdating,
    /** OAuth認証を開始する関数（再認証用） */
    handleOAuthConnect,
    /** APIキーを使用してサーバー設定を更新する関数 */
    handleUpdateWithApiKey,
  };
};
