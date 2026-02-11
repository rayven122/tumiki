/**
 * 既存のOAuthトークンを再利用するprocedure
 * 同じテンプレートで認証済みの他のインスタンスからトークンをコピーする
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { Prisma } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ReuseOAuthTokenInputV2 } from "./router";

type ReuseOAuthTokenInput = z.infer<typeof ReuseOAuthTokenInputV2>;

type ReuseOAuthTokenOutput = {
  /** 再利用が成功したかどうか */
  success: boolean;
  /** 作成されたトークンID */
  tokenId: string;
};

/**
 * 既存のOAuthトークンを再利用
 *
 * ソーストークンから accessToken, refreshToken, expiresAt をコピーして
 * ターゲットインスタンス用の新しいトークンレコードを作成（または更新）
 *
 * @param tx トランザクションクライアント
 * @param input 入力データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 再利用結果
 */
export const reuseOAuthToken = async (
  tx: PrismaTransactionClient,
  input: ReuseOAuthTokenInput,
  organizationId: string,
  userId: string,
): Promise<ReuseOAuthTokenOutput> => {
  // 1. ソーストークンを取得（権限チェック含む）
  const sourceToken = await tx.mcpOAuthToken.findUnique({
    where: { id: input.sourceTokenId },
    include: {
      oauthClient: true,
      mcpServerTemplateInstance: {
        include: {
          mcpServerTemplate: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!sourceToken || sourceToken.userId !== userId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "ソーストークンが見つかりません",
    });
  }

  if (sourceToken.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このトークンにアクセスする権限がありません",
    });
  }

  // 2. ターゲットインスタンスを取得（権限チェック含む）
  const targetInstance = await tx.mcpServerTemplateInstance.findUnique({
    where: { id: input.targetInstanceId },
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
      message: "ターゲットインスタンスが見つかりません",
    });
  }

  // 3. 同じテンプレートであることを確認
  const sourceTemplateId =
    sourceToken.mcpServerTemplateInstance.mcpServerTemplate.id;
  const targetTemplateId = targetInstance.mcpServerTemplate.id;

  if (sourceTemplateId !== targetTemplateId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ソースとターゲットのテンプレートが一致しません",
    });
  }

  // 4. トークンの有効期限をチェック
  if (sourceToken.expiresAt && sourceToken.expiresAt < new Date()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "ソーストークンは有効期限切れです",
    });
  }

  // 5. ターゲットインスタンス用のトークンをupsert
  // セキュリティ注記: accessToken, refreshToken はPrismaスキーマで @encrypted 属性により
  // データベース保存時に自動的に暗号化されるため、コピー時も暗号化状態が維持される
  try {
    const newToken = await tx.mcpOAuthToken.upsert({
      where: {
        userId_mcpServerTemplateInstanceId: {
          userId,
          mcpServerTemplateInstanceId: input.targetInstanceId,
        },
      },
      create: {
        userId,
        mcpServerTemplateInstanceId: input.targetInstanceId,
        oauthClientId: sourceToken.oauthClientId,
        organizationId,
        accessToken: sourceToken.accessToken,
        refreshToken: sourceToken.refreshToken,
        expiresAt: sourceToken.expiresAt,
        tokenPurpose: sourceToken.tokenPurpose,
      },
      update: {
        oauthClientId: sourceToken.oauthClientId,
        accessToken: sourceToken.accessToken,
        refreshToken: sourceToken.refreshToken,
        expiresAt: sourceToken.expiresAt,
        tokenPurpose: sourceToken.tokenPurpose,
      },
    });

    return {
      success: true,
      tokenId: newToken.id,
    };
  } catch (error) {
    // ユニーク制約違反（P2002）の場合は競合エラーとして処理
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "トークンの保存中に競合が発生しました。再度お試しください。",
      });
    }
    throw error;
  }
};
