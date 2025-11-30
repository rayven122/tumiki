import { useCallback } from "react";
import { toast } from "react-toastify";
import type { Prisma } from "@tumiki/db/prisma";
import { api } from "@/trpc/react";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

/**
 * MCPサーバー作成フォームのパラメータ
 */
type UseCreateServerFormParams = {
  /** MCPサーバーテンプレート（テンプレートベースの場合は必須、カスタムサーバーの場合は不要） */
  mcpServer?: McpServerTemplate;
  /** カスタムサーバーのURL（カスタムサーバー作成時に使用） */
  customUrl?: string;
  /** サーバー作成成功時のコールバック関数 */
  onSuccess: () => void;
};

/**
 * MCPサーバー作成フォームのカスタムフック
 *
 * テンプレートベースの公式サーバーとカスタムURLサーバーの両方の作成に対応します。
 * OAuth認証とAPIキー認証の2つの認証方式をサポートします。
 *
 * @param params - フックのパラメータ
 * @param params.mcpServer - MCPサーバーテンプレート（オプション）
 * @param params.customUrl - カスタムサーバーのURL（オプション）
 * @param params.onSuccess - サーバー作成成功時のコールバック
 * @returns サーバー作成に必要な状態とハンドラー関数
 */
export const useCreateServerForm = ({
  mcpServer,
  customUrl,
  onSuccess,
}: UseCreateServerFormParams) => {
  const utils = api.useUtils();

  // APIキー認証MCPサーバー作成（v2 APIを使用、テンプレートベースとカスタムURLの両方に対応）
  const { mutate: createApiKeyMcpServer, isPending: isAdding } =
    api.v2.userMcpServer.createApiKeyMcpServer.useMutation({
      onSuccess: async () => {
        toast.success(
          `${mcpServer?.name ?? customUrl ?? "サーバー"}が正常に追加されました。`,
        );
        await utils.userMcpServerInstance.invalidate();
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // OAuth認証MCPサーバー接続（v2 APIを使用）
  const { mutate: connectOAuthMcpServer, isPending: isOAuthConnecting } =
    api.v2.userMcpServer.connectOAuthMcpServer.useMutation({
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
   * OAuth認証フローを開始する
   *
   * MCPサーバーを作成し、OAuth認証が必要な場合は認証URLにリダイレクトします。
   * OAuthプロバイダーとスコープはDCRから取得されます。
   *
   * @param serverName - サーバー名
   * @param clientId - Client ID（オプション）
   * @param clientSecret - Client Secret（オプション）
   */
  const handleOAuthConnect = useCallback(
    (serverName: string, clientId?: string, clientSecret?: string) => {
      connectOAuthMcpServer({
        templateId: mcpServer?.id,
        customUrl: customUrl,
        name: serverName || mcpServer?.name,
        clientId: clientId,
        clientSecret: clientSecret,
      });
    },
    [mcpServer, customUrl, connectOAuthMcpServer],
  );

  /**
   * APIキーを使用してMCPサーバーを追加する
   *
   * テンプレートが存在する場合は公式サーバーとして、カスタムURLが指定されている場合は
   * カスタムサーバーとして追加します。
   *
   * @param serverName - サーバー名
   * @param envVars - 環境変数（APIキーなど）省略時は空のオブジェクトが使用されます
   */
  const handleAddWithApiKey = useCallback(
    (serverName: string, envVars?: Record<string, string>) => {
      createApiKeyMcpServer({
        mcpServerTemplateId: mcpServer?.id,
        customUrl: customUrl,
        envVars,
        name: serverName,
      });
    },
    [mcpServer?.id, customUrl, createApiKeyMcpServer],
  );

  return {
    /** 処理中かどうか（OAuth認証またはサーバー追加） */
    isPending: isOAuthConnecting || isAdding,
    /** OAuth認証を開始する関数 */
    handleOAuthConnect,
    /** APIキーを使用してサーバーを追加する関数 */
    handleAddWithApiKey,
  };
};
