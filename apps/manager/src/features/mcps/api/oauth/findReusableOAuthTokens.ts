/**
 * 再利用可能なOAuthトークンを検索するprocedure
 * 同じテンプレートで既に認証済みの他のインスタンスからトークンを再利用できるかチェック
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { FindReusableOAuthTokensInputV2 } from "./router";

type FindReusableOAuthTokensInput = z.infer<
  typeof FindReusableOAuthTokensInputV2
>;

/**
 * 再利用可能なトークン情報
 */
export type ReusableOAuthToken = {
  /** トークンID */
  tokenId: string;
  /** ソースとなるMCPサーバー名 */
  mcpServerName: string;
  /** ソースとなるMCPサーバーID */
  mcpServerId: string;
  /** ソースとなるテンプレートインスタンスID */
  sourceInstanceId: string;
  /** テンプレートのアイコンパス */
  iconPath: string | null;
  /** トークンの有効期限 */
  expiresAt: Date | null;
};

type FindReusableOAuthTokensOutput = {
  /** 再利用可能なトークン一覧 */
  tokens: ReusableOAuthToken[];
  /** 対象インスタンスが属するテンプレートID */
  mcpServerTemplateId: string;
};

/**
 * 再利用可能なOAuthトークンを検索
 *
 * 同じMCPサーバーテンプレートを使用している他のインスタンスで、
 * 既に認証済みかつ有効期限内のトークンを検索する
 *
 * @param tx トランザクションクライアント
 * @param input 入力データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 再利用可能なトークン一覧
 */
export const findReusableOAuthTokens = async (
  tx: PrismaTransactionClient,
  input: FindReusableOAuthTokensInput,
  organizationId: string,
  userId: string,
): Promise<FindReusableOAuthTokensOutput> => {
  // 1. 対象インスタンスを取得（権限チェック含む）
  const targetInstance = await tx.mcpServerTemplateInstance.findUnique({
    where: { id: input.mcpServerTemplateInstanceId },
    include: {
      mcpServer: {
        select: {
          id: true,
          organizationId: true,
        },
      },
      mcpServerTemplate: {
        select: {
          id: true,
          authType: true,
        },
      },
    },
  });

  if (
    !targetInstance ||
    targetInstance.mcpServer.organizationId !== organizationId
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  const template = targetInstance.mcpServerTemplate;
  if (!template?.authType || template.authType !== "OAUTH") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "このサーバーはOAuth認証に対応していません",
    });
  }

  // 2. 同じテンプレートを使用している他のインスタンスから、有効なトークンを検索
  // パフォーマンス最適化: selectで必要なフィールドのみを取得
  const now = new Date();
  const reusableTokens = await tx.mcpOAuthToken.findMany({
    where: {
      userId,
      organizationId,
      // 対象インスタンス自身のトークンは除外
      mcpServerTemplateInstanceId: {
        not: input.mcpServerTemplateInstanceId,
      },
      // 同じテンプレートのインスタンスのみ
      mcpServerTemplateInstance: {
        mcpServerTemplateId: template.id,
      },
      // 有効期限チェック（nullの場合は無期限として扱う）
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      mcpServerTemplateInstanceId: true,
      expiresAt: true,
      mcpServerTemplateInstance: {
        select: {
          mcpServer: {
            select: {
              id: true,
              name: true,
            },
          },
          mcpServerTemplate: {
            select: {
              iconPath: true,
            },
          },
        },
      },
    },
    orderBy: {
      // 有効期限が長いものを優先
      expiresAt: "desc",
    },
  });

  // 3. レスポンス形式に変換
  const tokens: ReusableOAuthToken[] = reusableTokens.map((token) => ({
    tokenId: token.id,
    mcpServerName: token.mcpServerTemplateInstance.mcpServer.name,
    mcpServerId: token.mcpServerTemplateInstance.mcpServer.id,
    sourceInstanceId: token.mcpServerTemplateInstanceId,
    iconPath: token.mcpServerTemplateInstance.mcpServerTemplate.iconPath,
    expiresAt: token.expiresAt,
  }));

  return {
    tokens,
    mcpServerTemplateId: template.id,
  };
};
