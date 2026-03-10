import { useCallback } from "react";
import { toast } from "react-toastify";
import type { TransportType } from "@tumiki/db/prisma";
import { api } from "@/trpc/react";

/**
 * MCPサーバー作成フォームのパラメータ
 */
type UseCreateServerFormParams = {
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
 * @param params.onSuccess - サーバー作成成功時のコールバック
 * @returns サーバー作成に必要な状態とハンドラー関数
 */
export const useCreateServerForm = ({
  onSuccess,
}: UseCreateServerFormParams) => {
  const utils = api.useUtils();

  // APIキー認証MCPサーバー作成（v2 APIを使用、テンプレートベースとカスタムURLの両方に対応）
  const { mutate: createApiKeyMcpServer, isPending: isAdding } =
    api.userMcpServer.createApiKeyMcpServer.useMutation({
      onSuccess: async (_, variables) => {
        toast.success(`${variables.name}が正常に追加されました。`);
        await utils.userMcpServer.findMcpServers.invalidate();
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // OAuth認証MCPサーバー接続（v2 APIを使用）
  const { mutate: connectOAuthMcpServer, isPending: isOAuthConnecting } =
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
   * OAuth認証フローを開始する
   *
   * MCPサーバーを作成し、OAuth認証が必要な場合は認証URLにリダイレクトします。
   * OAuthプロバイダーとスコープはDCRから取得されます。
   */
  const handleOAuthConnect = useCallback(
    (params: {
      serverName: string;
      slug: string;
      mcpServerTemplateId?: string;
      customUrl?: string;
      transportType?: TransportType;
      clientId?: string;
      clientSecret?: string;
    }) => {
      connectOAuthMcpServer({
        templateId: params.mcpServerTemplateId,
        customUrl: params.customUrl,
        name: params.serverName,
        slug: params.slug,
        transportType: params.transportType,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
      });
    },
    [connectOAuthMcpServer],
  );

  /**
   * APIキーを使用してMCPサーバーを追加する
   *
   * テンプレートが存在する場合は公式サーバーとして、カスタムURLが指定されている場合は
   * カスタムサーバーとして追加します。
   */
  const handleAddWithApiKey = useCallback(
    (params: {
      serverName: string;
      slug: string;
      authType: "NONE" | "API_KEY";
      transportType?: TransportType;
      mcpServerTemplateId?: string;
      customUrl?: string;
      envVars?: Record<string, string>;
    }) => {
      createApiKeyMcpServer({
        mcpServerTemplateId: params.mcpServerTemplateId,
        customUrl: params.customUrl,
        transportType: params.transportType,
        envVars: params.envVars,
        name: params.serverName,
        slug: params.slug,
        authType: params.authType,
      });
    },
    [createApiKeyMcpServer],
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
