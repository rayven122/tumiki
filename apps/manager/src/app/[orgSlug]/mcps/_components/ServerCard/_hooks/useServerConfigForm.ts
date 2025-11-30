import { useState, useCallback } from "react";
import { normalizeServerName } from "@/utils/url";
import type { Prisma } from "@tumiki/db/prisma";
import { useCreateServerForm } from "./useCreateServerForm";
import { useEditServerForm } from "./useEditServerForm";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

/**
 * MCPサーバー設定フォームのパラメータ
 */
type UseServerConfigFormParams = {
  /** MCPサーバーテンプレート */
  mcpServer: McpServerTemplate;
  /** ユーザーMCPサーバーID（編集モードの場合は必須） */
  userMcpServerId?: string;
  /** 初期環境変数（編集モードの場合に使用） */
  initialEnvVars?: Record<string, string>;
  /** モード（作成 or 編集） */
  mode?: "create" | "edit";
  /** サーバー作成/更新成功時のコールバック関数 */
  onSuccess: () => void;
};

/**
 * MCPサーバー設定フォームの統合カスタムフック
 *
 * 作成モードと編集モードの両方に対応し、適切なフックを内部で使い分けます。
 * OAuth認証とAPIキー認証の2つの認証方式をサポートします。
 *
 * @param params - フックのパラメータ
 * @returns サーバー設定に必要な状態とハンドラー関数
 */
export const useServerConfigForm = ({
  mcpServer,
  userMcpServerId,
  initialEnvVars,
  mode = "create",
  onSuccess,
}: UseServerConfigFormParams) => {
  // 環境変数の状態管理
  const [envVars, setEnvVars] = useState<Record<string, string>>(() => {
    // 初期値として既存のトークンがある場合はそれを使用し、ない場合は空文字列を設定
    return mcpServer.envVarKeys.reduce((acc, envVar) => {
      return { ...acc, [envVar]: initialEnvVars?.[envVar] ?? "" };
    }, {});
  });

  // サーバー名の状態管理
  const [serverName, setServerName] = useState(
    normalizeServerName(mcpServer.name),
  );

  // 認証方法の選択状態
  const [authMethod, setAuthMethod] = useState<"oauth" | "apikey">("oauth");

  // 作成モード用のフック
  const createForm = useCreateServerForm({
    mcpServer,
    onSuccess,
  });

  // 編集モード用のフック
  const editForm = useEditServerForm({
    mcpServer,
    userMcpServerId: userMcpServerId!,
    onSuccess,
  });

  // モードに応じて適切なフックを選択
  const activeForm = mode === "create" ? createForm : editForm;

  // OAuth対応MCPかどうかをDBのauthTypeで判定
  const isOAuthSupported = mcpServer.authType === "OAUTH";

  // 環境変数の値を更新する関数
  const handleEnvVarChange = useCallback((envVar: string, value: string) => {
    setEnvVars((prev) => ({
      ...prev,
      [envVar]: value,
    }));
  }, []);

  // フォームのバリデーション
  const isFormValid = useCallback(() => {
    // サーバー名が入力されているかチェック
    if (!serverName.trim()) return false;
    // mcpServerに環境変数がない場合はサーバー名のみで有効
    if (mcpServer.envVarKeys.length === 0) return true;
    return Object.values(envVars).some((token) => token.trim() !== "");
  }, [serverName, mcpServer.envVarKeys.length, envVars]);

  // フォーム送信処理
  const handleSubmit = useCallback(() => {
    if (isOAuthSupported && authMethod === "oauth") {
      // OAuth認証の場合
      activeForm.handleOAuthConnect(serverName);
    } else {
      // APIキー認証の場合
      if (mode === "create") {
        // envVarsの有無でauthTypeを判定
        const authType = Object.values(envVars).some((v) => v.trim() !== "")
          ? "API_KEY"
          : "NONE";
        createForm.handleAddWithApiKey(serverName, authType, envVars);
      } else {
        editForm.handleUpdateWithApiKey(envVars);
      }
    }
  }, [
    isOAuthSupported,
    authMethod,
    serverName,
    envVars,
    mode,
    activeForm,
    createForm,
    editForm,
  ]);

  return {
    /** 環境変数の状態 */
    envVars,
    /** サーバー名 */
    serverName,
    /** 認証方法 */
    authMethod,
    /** 処理中かどうか */
    isProcessing: activeForm.isPending,
    /** 検証中かどうか（作成モードのみ） */
    isValidating: false, // 現在は使用されていないが互換性のために残す
    /** OAuth接続中かどうか */
    isOAuthConnecting: false,
    /** 追加中かどうか（作成モードのみ） */
    isAdding: false,
    /** 環境変数の値を変更する関数 */
    handleEnvVarChange,
    /** サーバー名を設定する関数 */
    setServerName,
    /** 認証方法を設定する関数 */
    setAuthMethod,
    /** フォームを送信する関数 */
    handleSubmit,
    /** フォームが有効かどうかを判定する関数 */
    isFormValid,
  };
};
