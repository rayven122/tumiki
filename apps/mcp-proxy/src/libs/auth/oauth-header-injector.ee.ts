/**
 * SPDX-License-Identifier: Elastic-2.0
 * This file is part of Tumiki Enterprise Edition.
 */

/**
 * OAuth認証ヘッダー注入ミドルウェア
 *
 * @tumiki/oauth-token-manager を使用してトークンを取得し、
 * リモートMCPサーバーへのリクエストに認証ヘッダーを注入
 */

import {
  getValidToken,
  ReAuthRequiredError,
} from "@tumiki/oauth-token-manager";
import type { McpConfig, McpServerTemplate } from "@tumiki/db/prisma";
import { getCloudRunIdToken } from "./cloudRunAuth.ee.js";
import { logError } from "../logger/index.js";
import { z } from "zod";

/**
 * envVars の型安全なパーススキーマ
 * Record<string, string> の形式を強制
 */
const envVarsSchema = z.record(z.string(), z.string());

/**
 * 認証ヘッダーを注入
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート情報
 * @param userId - ユーザーID（OAuth認証時に使用）
 * @param mcpServerTemplateInstanceId - MCPサーバーテンプレートインスタンスID（OAuth認証時に使用）
 * @param mcpConfig - MCPサーバー設定（API Key認証時に使用、オプショナル）
 * @returns 認証ヘッダー
 */
export const injectAuthHeaders = async (
  mcpServerTemplate: McpServerTemplate,
  userId: string,
  mcpServerTemplateInstanceId: string,
  mcpConfig: McpConfig | null,
): Promise<Record<string, string>> => {
  const { authType } = mcpServerTemplate;

  switch (authType) {
    case "OAUTH": {
      return await injectOAuthHeaders(
        mcpServerTemplate,
        userId,
        mcpServerTemplateInstanceId,
        mcpConfig,
      );
    }
    case "API_KEY": {
      return await injectApiKeyHeaders(mcpServerTemplate, mcpConfig);
    }
    case "NONE": {
      return {};
    }

    default: {
      throw new Error(`Unknown auth type: ${String(authType)}`);
    }
  }
};

/**
 * OAuthトークンを取得してAuthorizationヘッダーに注入
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート情報
 * @param userId - ユーザーID
 * @param mcpServerTemplateInstanceId - MCPサーバーテンプレートインスタンスID
 * @param mcpConfig - MCPサーバー設定（追加のカスタムヘッダー用、オプショナル）
 * @returns 認証ヘッダー
 */
const injectOAuthHeaders = async (
  mcpServerTemplate: McpServerTemplate,
  userId: string,
  mcpServerTemplateInstanceId: string,
  mcpConfig: McpConfig | null,
): Promise<Record<string, string>> => {
  try {
    const headers: Record<string, string> = {};

    // @tumiki/oauth-token-manager でトークンを取得
    // 自動的にキャッシュから取得、期限切れ間近ならリフレッシュ
    const rawToken = await getValidToken(mcpServerTemplateInstanceId, userId);

    // Authorization: Bearer ヘッダーを設定
    headers.Authorization = `Bearer ${rawToken.accessToken}`;

    // mcpConfigがある場合、envVarsから追加のカスタムヘッダーを付与
    if (mcpConfig) {
      const customHeaders = parseAndInjectEnvVarHeaders(
        mcpServerTemplate,
        mcpConfig,
      );
      Object.assign(headers, customHeaders);
    }

    return headers;
  } catch (error) {
    // ReAuthRequiredError はそのまま伝播させる（401 レスポンス生成のため）
    if (error instanceof ReAuthRequiredError) {
      throw error;
    }
    logError("Failed to inject OAuth headers", error as Error);
    throw new Error(
      `Failed to inject OAuth headers: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * APIキーをヘッダーに注入
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート情報
 * @param mcpConfig - MCPサーバー設定（認証情報、オプショナル）
 * @returns 認証ヘッダー
 */
const injectApiKeyHeaders = async (
  mcpServerTemplate: McpServerTemplate,
  mcpConfig: McpConfig | null,
): Promise<Record<string, string>> => {
  try {
    const headers: Record<string, string> = {};

    // Cloud Run IAM認証が必要な場合、Authorizationヘッダーを追加
    if (mcpServerTemplate.useCloudRunIam && mcpServerTemplate.url) {
      const idToken = await getCloudRunIdToken(mcpServerTemplate.url);
      headers.Authorization = `Bearer ${idToken}`;
    }

    // mcpConfigがある場合、envVarsから追加のカスタムヘッダーを付与
    if (mcpConfig) {
      const customHeaders = parseAndInjectEnvVarHeaders(
        mcpServerTemplate,
        mcpConfig,
      );
      Object.assign(headers, customHeaders);
    }

    return headers;
  } catch (error) {
    logError("Failed to inject API key headers", error as Error);
    throw new Error(
      `Failed to inject API key headers: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * mcpConfig の envVars をパースして、envVarKeys に対応するヘッダーを生成
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート情報
 * @param mcpConfig - MCPサーバー設定
 * @returns カスタムヘッダー
 */
const parseAndInjectEnvVarHeaders = (
  mcpServerTemplate: McpServerTemplate,
  mcpConfig: McpConfig,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  const parsed: unknown = JSON.parse(mcpConfig.envVars);
  const envVars = envVarsSchema.parse(parsed);

  // MCPサーバーテンプレートで定義されたenvVarKeysのキー名を使用
  // 例: ["Tumiki-API-Key", "X-Custom-Header"] → 各キーに対応する値をヘッダーにセット
  for (const headerName of mcpServerTemplate.envVarKeys) {
    if (headerName && envVars[headerName]) {
      headers[headerName] = envVars[headerName];
    }
  }

  return headers;
};
