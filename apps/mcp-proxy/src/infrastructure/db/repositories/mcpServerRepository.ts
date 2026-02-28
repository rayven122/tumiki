/**
 * McpServer リポジトリ
 *
 * McpServer関連のDBクエリを提供。
 * OAuth認証時にMcpServerからorganizationIdを取得するためのサービス。
 */

import { db, type PiiMaskingMode, type AuthType } from "@tumiki/db/server";
import { logError, logWarn } from "../../../shared/logger/index.js";

/**
 * McpServer検索結果の型
 */
export type McpServerLookupResult = {
  id: string;
  organizationId: string;
  deletedAt: Date | null;
  authType: AuthType;
  /** PIIマスキングモード（GCP DLPによるマスキング） */
  piiMaskingMode: PiiMaskingMode;
  /** 使用するInfoType一覧（空配列 = 全InfoType使用） */
  piiInfoTypes: string[];
  /** TOON変換を有効にするかどうか（AIへのトークン削減用） */
  toonConversionEnabled: boolean;
};

/**
 * McpServer検索用の共通select句
 */
const mcpServerSelectFields = {
  id: true,
  organizationId: true,
  deletedAt: true,
  authType: true,
  piiMaskingMode: true,
  piiInfoTypes: true,
  toonConversionEnabled: true,
} as const;

/**
 * McpServerのorganizationIdを取得
 *
 * @param mcpServerId - McpServer ID
 * @returns McpServer情報（見つからない場合はnull）
 */
export const getMcpServerOrganization = async (
  mcpServerId: string,
): Promise<McpServerLookupResult | null> => {
  try {
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      select: mcpServerSelectFields,
    });

    if (!mcpServer) {
      logWarn("McpServer not found", { mcpServerId });
      return null;
    }

    return mcpServer;
  } catch (error) {
    logError("Failed to get McpServer from DB", error as Error, {
      mcpServerId,
    });
    throw error;
  }
};

/**
 * ユーザーが組織のメンバーかどうかを確認
 *
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns メンバーであればtrue、そうでなければfalse
 */
export const checkOrganizationMembership = async (
  organizationId: string,
  userId: string,
): Promise<boolean> => {
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { id: true },
  });

  return member !== null;
};

/**
 * McpServerTemplateInstance 検索結果の型
 */
export type TemplateInstanceLookupResult = {
  id: string;
  mcpServerId: string;
};

/**
 * McpServerTemplateInstance を ID で取得
 *
 * Protected Resource Metadata エンドポイントで
 * インスタンスの存在確認に使用する。
 *
 * @param instanceId - McpServerTemplateInstance ID
 * @returns インスタンス情報（見つからない場合はnull）
 */
export const getTemplateInstanceById = async (
  instanceId: string,
): Promise<TemplateInstanceLookupResult | null> => {
  try {
    const instance = await db.mcpServerTemplateInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        mcpServerId: true,
      },
    });

    if (!instance) {
      logWarn("McpServerTemplateInstance not found", { instanceId });
      return null;
    }

    return instance;
  } catch (error) {
    logError(
      "Failed to get McpServerTemplateInstance from DB",
      error as Error,
      { instanceId },
    );
    throw error;
  }
};

/**
 * slugとorganizationIdでMcpServerを取得
 *
 * パスパラメータがslugに変更されたため、slugからMcpServerを検索する。
 * 組織内でslugはユニークなので、organizationIdとslugの組み合わせで一意に特定可能。
 *
 * @param slug - MCP Server のslug
 * @param organizationId - 組織ID
 * @returns McpServer情報（見つからない場合はnull）
 */
export const getMcpServerBySlug = async (
  slug: string,
  organizationId: string,
): Promise<McpServerLookupResult | null> => {
  try {
    const mcpServer = await db.mcpServer.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
      select: mcpServerSelectFields,
    });

    if (!mcpServer) {
      logWarn("McpServer not found by slug", { slug, organizationId });
      return null;
    }

    return mcpServer;
  } catch (error) {
    logError("Failed to get McpServer by slug from DB", error as Error, {
      slug,
      organizationId,
    });
    throw error;
  }
};

/**
 * CUID形式かどうかを判定
 *
 * CUIDの特徴:
 * - `c`で始まる
 * - 25文字（cuid v1）または24文字（cuid2）の英数字
 * - 小文字のみ
 * - ハイフンを含まない
 *
 * 誤判定を防ぐため、厳密な長さチェックを行う。
 * slugが `c` で始まる場合でも、CUIDの正確な長さ（24-25文字）でなければslugと判定される。
 *
 * @param value - 判定する文字列
 * @returns CUID形式ならtrue
 */
const isCuid = (value: string): boolean => {
  // slugはハイフンを含むことが多いので、ハイフンがあればslugと判定
  if (value.includes("-")) {
    return false;
  }

  // CUIDは小文字のみで構成される（大文字が含まれていればslug）
  if (value !== value.toLowerCase()) {
    return false;
  }

  // CUID v1: 25文字、CUID2: 24文字
  // slugとの誤判定を防ぐため、厳密な長さチェック
  const length = value.length;
  if (length !== 24 && length !== 25) {
    return false;
  }

  // `c`で始まり、英数字のみで構成される
  return /^c[a-z0-9]+$/.test(value);
};

/**
 * slugまたはIDでMcpServerを取得
 *
 * パスパラメータにslugまたはIDのどちらが渡されても対応できるようにする。
 * CUID形式かどうかを判定し、適切なfindUniqueクエリを使用。
 *
 * @param slugOrId - MCP Server のslugまたはID
 * @param organizationId - 組織ID（slugで検索する場合に使用、IDで検索する場合は結果の検証に使用）
 * @returns McpServer情報（見つからない場合はnull）
 */
export const getMcpServerBySlugOrId = async (
  slugOrId: string,
  organizationId: string,
): Promise<McpServerLookupResult | null> => {
  try {
    // CUID形式の場合はIDで検索
    if (isCuid(slugOrId)) {
      const mcpServer = await db.mcpServer.findUnique({
        where: { id: slugOrId },
        select: mcpServerSelectFields,
      });

      if (!mcpServer) {
        logWarn("McpServer not found by ID", { id: slugOrId, organizationId });
        return null;
      }

      // IDで見つかった場合、organizationIdが一致するか検証
      if (mcpServer.organizationId !== organizationId) {
        logWarn("McpServer organizationId mismatch", {
          id: slugOrId,
          expectedOrgId: organizationId,
          actualOrgId: mcpServer.organizationId,
        });
        return null;
      }

      return mcpServer;
    }

    // slug形式の場合はslugで検索
    const mcpServer = await db.mcpServer.findUnique({
      where: {
        organizationId_slug: { organizationId, slug: slugOrId },
      },
      select: mcpServerSelectFields,
    });

    if (!mcpServer) {
      logWarn("McpServer not found by slug", { slug: slugOrId, organizationId });
      return null;
    }

    return mcpServer;
  } catch (error) {
    logError("Failed to get McpServer by slug or ID from DB", error as Error, {
      slugOrId,
      organizationId,
    });
    throw error;
  }
};
