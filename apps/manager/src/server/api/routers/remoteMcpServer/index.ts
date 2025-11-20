/**
 * リモートMCPサーバー tRPCルーター
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { createRemoteMcpServer } from "./create";
import { initiateOAuth } from "./initiateOAuth";
import { updateCredentials } from "./updateCredentials";
import { testConnection } from "./testConnection";

/**
 * リモートMCPサーバー作成の入力スキーマ
 */
export const CreateRemoteMcpServerInput = z.object({
  // テンプレート使用の場合
  templateId: z.string().optional(),

  // カスタムURL使用の場合
  customUrl: z.string().url().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  authType: z.enum(["OAUTH", "API_KEY", "NONE"]),
  oauthProvider: z.string().optional(), // authType=OAUTHの場合必須

  // 認証情報（authTypeに応じて）
  credentials: z
    .object({
      apiKey: z.string().optional(),
      bearerToken: z.string().optional(),
      envVars: z.record(z.string()).optional(), // 汎用的な環境変数
      clientId: z.string().optional(), // OAuth用: 事前取得したclient ID
      clientSecret: z.string().optional(), // OAuth用: 事前取得したclient secret
    })
    .optional(),

  // OAuth用スコープ（オプション）
  scopes: z.array(z.string()).optional(),

  // 可視性
  visibility: z.enum(["PRIVATE", "ORGANIZATION", "PUBLIC"]).default("PRIVATE"),
  organizationId: z.string().optional(),
});

/**
 * OAuth認証開始の入力スキーマ
 */
export const InitiateOAuthInput = z.object({
  mcpServerId: z.string(),
  userMcpConfigId: z.string(),
  scopes: z.array(z.string()).optional(),
});

/**
 * 認証情報更新の入力スキーマ
 */
export const UpdateCredentialsInput = z.object({
  userMcpConfigId: z.string(),
  credentials: z.object({
    apiKey: z.string().optional(),
    bearerToken: z.string().optional(),
    envVars: z.record(z.string()).optional(),
  }),
});

/**
 * 接続テストの入力スキーマ
 */
export const TestConnectionInput = z.object({
  userMcpConfigId: z.string(),
});

/**
 * リモートMCPサーバールーター
 */
export const remoteMcpServerRouter = createTRPCRouter({
  /**
   * リモートMCPサーバーを作成
   */
  create: protectedProcedure
    .input(CreateRemoteMcpServerInput)
    .mutation(createRemoteMcpServer),

  /**
   * OAuth認証を開始
   */
  initiateOAuth: protectedProcedure
    .input(InitiateOAuthInput)
    .mutation(initiateOAuth),

  /**
   * 認証情報を更新
   */
  updateCredentials: protectedProcedure
    .input(UpdateCredentialsInput)
    .mutation(updateCredentials),

  /**
   * 接続テスト
   */
  testConnection: protectedProcedure
    .input(TestConnectionInput)
    .query(testConnection),
});
