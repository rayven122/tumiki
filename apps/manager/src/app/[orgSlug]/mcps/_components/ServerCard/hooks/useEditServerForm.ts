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
 *
 * @example
 * ```tsx
 * const { handleOAuthConnect, handleUpdateWithApiKey, isUpdating } = useEditServerForm({
 *   mcpServer: template,
 *   userMcpServerId: 'server-id',
 *   onSuccess: () => console.log('Updated!'),
 * });
 * ```
 */
export const useEditServerForm = ({
  mcpServer,
  userMcpServerId,
  onSuccess,
}: UseEditServerFormParams) => {
  const utils = api.useUtils();

  // サーバー設定更新（v2 APIを使用）
  const { mutate: updateServerConfig, isPending: isUpdating } =
    api.v2.userMcpServer.update.useMutation({
      onSuccess: async () => {
        toast.success(`${mcpServer.name}のAPIトークンが正常に更新されました。`);
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
        toast.success("MCPサーバーの作成に成功しました");
        // OAuth認証画面にリダイレクト
        toast.info("OAuth認証画面に移動します...");
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        console.error("OAuth認証の開始に失敗:", error);
        toast.error(
          error instanceof Error ? error.message : "設定の作成に失敗しました",
        );
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
    async (serverName: string) => {
      if (createOAuthMcpServerMutation.isPending) {
        console.log("OAuth認証処理中のため、重複実行をスキップ");
        return;
      }

      await createOAuthMcpServerMutation.mutateAsync({
        templateId: mcpServer.id,
        name: serverName || mcpServer.name,
      });
    },
    [mcpServer.id, mcpServer.name, createOAuthMcpServerMutation],
  );

  /**
   * APIキーを使用してMCPサーバーの設定を更新する
   *
   * @param envVars - 更新する環境変数（APIキーなど）
   */
  const handleUpdateWithApiKey = useCallback(
    (envVars: Record<string, string>) => {
      updateServerConfig({
        id: userMcpServerId,
        envVars,
      });
    },
    [userMcpServerId, updateServerConfig],
  );

  return {
    /** OAuth認証処理中かどうか */
    isOAuthConnecting: createOAuthMcpServerMutation.isPending,
    /** サーバー更新処理中かどうか */
    isUpdating,
    /** OAuth認証を開始する関数（再認証用） */
    handleOAuthConnect,
    /** APIキーを使用してサーバー設定を更新する関数 */
    handleUpdateWithApiKey,
  };
};
