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
 *
 * @example
 * ```tsx
 * // テンプレートベースの場合
 * const { handleOAuthConnect, handleAddWithApiKey, isAdding } = useCreateServerForm({
 *   mcpServer: template,
 *   onSuccess: () => console.log('Success!'),
 * });
 *
 * // カスタムサーバーの場合
 * const { handleAddWithApiKey } = useCreateServerForm({
 *   customUrl: 'https://example.com/mcp',
 *   onSuccess: () => console.log('Success!'),
 * });
 * ```
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

  // OAuth認証MCPサーバー作成（v2 APIを使用）
  const createOAuthMcpServerMutation =
    api.v2.userMcpServer.createOAuthMcpServer.useMutation({
      onSuccess: async (response) => {
        // OAuth認証画面にリダイレクト
        toast.info("OAuth認証画面に移動します...");
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "設定の作成に失敗しました",
        );
      },
    });

  /**
   * OAuth認証フローを開始する
   *
   * MCPサーバーを作成し、OAuth認証が必要な場合は認証URLにリダイレクトします。
   * OAuthプロバイダーとスコープはDCRから取得されます。
   *
   * @param serverName - サーバー名
   */
  const handleOAuthConnect = useCallback(
    async (serverName: string) => {
      await createOAuthMcpServerMutation.mutateAsync({
        templateId: mcpServer?.id,
        customUrl: customUrl,
        name: serverName || mcpServer?.name,
      });
    },
    [mcpServer, customUrl, createOAuthMcpServerMutation],
  );

  /**
   * APIキーを使用してMCPサーバーを追加する
   *
   * テンプレートが存在する場合は公式サーバーとして、カスタムURLが指定されている場合は
   * カスタムサーバーとして追加します。
   *
   * @param serverName - サーバー名
   * @param envVars - 環境変数（APIキーなど）
   */
  const handleAddWithApiKey = useCallback(
    (serverName: string, envVars: Record<string, string>) => {
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
    /** OAuth認証処理中かどうか */
    isOAuthConnecting: createOAuthMcpServerMutation.isPending,
    /** サーバー追加処理中かどうか */
    isAdding,
    /** OAuth認証を開始する関数 */
    handleOAuthConnect,
    /** APIキーを使用してサーバーを追加する関数 */
    handleAddWithApiKey,
  };
};
