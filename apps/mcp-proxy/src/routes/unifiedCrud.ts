/**
 * 統合MCPサーバーCRUD APIルート
 *
 * URL: /unified
 *
 * 統合MCPサーバーの作成・一覧・詳細・更新・削除を行うAPI。
 * JWT認証のみをサポート。
 */

import { Hono } from "hono";
import { db } from "@tumiki/db/server";
import type { HonoEnv } from "../types/index.js";
import {
  unifiedCrudJwtAuthMiddleware,
  unifiedOwnershipMiddleware,
} from "../middleware/auth/unifiedCrudJwt.js";
import { logError, logInfo } from "../libs/logger/index.js";
import {
  createInvalidRequestError,
  createNotFoundError,
} from "../libs/error/index.js";
import type {
  CreateUnifiedMcpServerRequest,
  UpdateUnifiedMcpServerRequest,
  UnifiedMcpServerResponse,
  UnifiedMcpServerListResponse,
} from "../services/unifiedMcp/types.js";

export const unifiedCrudRoute = new Hono<HonoEnv>();

// 全エンドポイントにJWT認証を適用
unifiedCrudRoute.use("/*", unifiedCrudJwtAuthMiddleware);

/**
 * 統合MCPサーバー作成
 *
 * POST /unified
 *
 * リクエスト:
 * - name: string (必須) - 統合サーバー名
 * - description?: string - 統合サーバーの説明
 * - mcpServerIds: string[] (必須、最低1件) - 子MCPサーバーIDの配列
 *
 * バリデーション:
 * - mcpServerIdsが空配列の場合はエラー
 * - 指定されたmcpServerIdが同一組織内に存在しない場合はエラー
 * - ユーザーがOAuthトークンを持っていないサーバーが含まれる場合はエラー
 */
unifiedCrudRoute.post("/", async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  const { organizationId, userId } = authContext;

  try {
    const body = await c.req.json<CreateUnifiedMcpServerRequest>();

    // バリデーション: 名前は必須
    if (!body.name || body.name.trim() === "") {
      return c.json(createInvalidRequestError("name is required"), 400);
    }

    // バリデーション: mcpServerIdsは最低1件必須
    if (!body.mcpServerIds || body.mcpServerIds.length === 0) {
      return c.json(
        createInvalidRequestError("mcpServerIds must contain at least one ID"),
        400,
      );
    }

    // 指定されたMCPサーバーが同一組織内に存在するか確認
    const mcpServers = await db.mcpServer.findMany({
      where: {
        id: { in: body.mcpServerIds },
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        serverStatus: true,
      },
    });

    if (mcpServers.length !== body.mcpServerIds.length) {
      const foundIds = new Set(mcpServers.map((s) => s.id));
      const missingIds = body.mcpServerIds.filter((id) => !foundIds.has(id));
      return c.json(
        createInvalidRequestError(
          `Some MCP servers not found or not in organization: ${missingIds.join(", ")}`,
        ),
        400,
      );
    }

    // OAuthトークンの存在確認（各MCPサーバーのテンプレートインスタンスに対して）
    const templateInstances = await db.mcpServerTemplateInstance.findMany({
      where: {
        mcpServerId: { in: body.mcpServerIds },
      },
      include: {
        mcpServerTemplate: {
          select: {
            authType: true,
          },
        },
        oauthTokens: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    // OAuth認証が必要なインスタンスでトークンがないものをチェック
    const missingOAuthInstances = templateInstances.filter(
      (instance) =>
        instance.mcpServerTemplate.authType === "OAUTH" &&
        instance.oauthTokens.length === 0,
    );

    if (missingOAuthInstances.length > 0) {
      const instanceNames = missingOAuthInstances
        .map((i) => i.normalizedName)
        .join(", ");
      return c.json(
        createInvalidRequestError(
          `OAuth tokens not found for some instances: ${instanceNames}. Please authenticate first.`,
        ),
        400,
      );
    }

    // 統合MCPサーバーを作成
    const unifiedServer = await db.unifiedMcpServer.create({
      data: {
        name: body.name.trim(),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        description: body.description?.trim() || null,
        organizationId,
        createdBy: userId,
        childServers: {
          create: body.mcpServerIds.map((mcpServerId, index) => ({
            mcpServerId,
            displayOrder: index,
          })),
        },
      },
      include: {
        childServers: {
          orderBy: { displayOrder: "asc" },
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                serverStatus: true,
              },
            },
          },
        },
      },
    });

    logInfo("Unified MCP server created", {
      unifiedId: unifiedServer.id,
      name: unifiedServer.name,
      childServerCount: unifiedServer.childServers.length,
    });

    const response: UnifiedMcpServerResponse = {
      id: unifiedServer.id,
      name: unifiedServer.name,
      description: unifiedServer.description,
      organizationId: unifiedServer.organizationId,
      createdBy: unifiedServer.createdBy,
      mcpServers: unifiedServer.childServers.map((child) => ({
        id: child.mcpServer.id,
        name: child.mcpServer.name,
        serverStatus: child.mcpServer.serverStatus,
      })),
      createdAt: unifiedServer.createdAt.toISOString(),
      updatedAt: unifiedServer.updatedAt.toISOString(),
    };

    return c.json(response, 201);
  } catch (error) {
    logError("Failed to create unified MCP server", error as Error);
    return c.json(
      createInvalidRequestError("Failed to create unified MCP server"),
      500,
    );
  }
});

/**
 * 統合MCPサーバー一覧取得
 *
 * GET /unified
 *
 * 作成者（createdBy = 認証ユーザー）の統合サーバーのみ返却
 */
unifiedCrudRoute.get("/", async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  const { userId } = authContext;

  try {
    const unifiedServers = await db.unifiedMcpServer.findMany({
      where: {
        createdBy: userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        childServers: {
          orderBy: { displayOrder: "asc" },
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                serverStatus: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    const response: UnifiedMcpServerListResponse = {
      items: unifiedServers.map((server) => ({
        id: server.id,
        name: server.name,
        description: server.description,
        organizationId: server.organizationId,
        createdBy: server.createdBy,
        mcpServers: server.childServers
          .filter((child) => child.mcpServer.deletedAt === null)
          .map((child) => ({
            id: child.mcpServer.id,
            name: child.mcpServer.name,
            serverStatus: child.mcpServer.serverStatus,
          })),
        createdAt: server.createdAt.toISOString(),
        updatedAt: server.updatedAt.toISOString(),
      })),
    };

    return c.json(response);
  } catch (error) {
    logError("Failed to list unified MCP servers", error as Error);
    return c.json(
      createInvalidRequestError("Failed to list unified MCP servers"),
      500,
    );
  }
});

/**
 * 統合MCPサーバー詳細取得
 *
 * GET /unified/:id
 *
 * 作成者のみアクセス可能
 */
unifiedCrudRoute.get("/:id", unifiedOwnershipMiddleware, async (c) => {
  const unifiedId = c.req.param("id");

  try {
    const unifiedServer = await db.unifiedMcpServer.findUnique({
      where: { id: unifiedId },
      include: {
        childServers: {
          orderBy: { displayOrder: "asc" },
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                serverStatus: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!unifiedServer) {
      return c.json(
        createNotFoundError(`Unified MCP Server not found: ${unifiedId}`),
        404,
      );
    }

    const response: UnifiedMcpServerResponse = {
      id: unifiedServer.id,
      name: unifiedServer.name,
      description: unifiedServer.description,
      organizationId: unifiedServer.organizationId,
      createdBy: unifiedServer.createdBy,
      mcpServers: unifiedServer.childServers
        .filter((child) => child.mcpServer.deletedAt === null)
        .map((child) => ({
          id: child.mcpServer.id,
          name: child.mcpServer.name,
          serverStatus: child.mcpServer.serverStatus,
        })),
      createdAt: unifiedServer.createdAt.toISOString(),
      updatedAt: unifiedServer.updatedAt.toISOString(),
    };

    return c.json(response);
  } catch (error) {
    logError("Failed to get unified MCP server", error as Error);
    return c.json(
      createInvalidRequestError("Failed to get unified MCP server"),
      500,
    );
  }
});

/**
 * 統合MCPサーバー更新
 *
 * PUT /unified/:id
 *
 * リクエスト:
 * - name?: string - 統合サーバー名
 * - description?: string - 統合サーバーの説明
 * - mcpServerIds?: string[] - 子MCPサーバーIDの配列（完全置換、最低1件必須）
 */
unifiedCrudRoute.put("/:id", unifiedOwnershipMiddleware, async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  const { organizationId, userId } = authContext;
  const unifiedId = c.req.param("id");

  try {
    const body = await c.req.json<UpdateUnifiedMcpServerRequest>();

    // mcpServerIdsが指定された場合のバリデーション
    if (body.mcpServerIds !== undefined) {
      if (body.mcpServerIds.length === 0) {
        return c.json(
          createInvalidRequestError(
            "mcpServerIds must contain at least one ID",
          ),
          400,
        );
      }

      // 指定されたMCPサーバーが同一組織内に存在するか確認
      const mcpServers = await db.mcpServer.findMany({
        where: {
          id: { in: body.mcpServerIds },
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (mcpServers.length !== body.mcpServerIds.length) {
        const foundIds = new Set(mcpServers.map((s) => s.id));
        const missingIds = body.mcpServerIds.filter((id) => !foundIds.has(id));
        return c.json(
          createInvalidRequestError(
            `Some MCP servers not found or not in organization: ${missingIds.join(", ")}`,
          ),
          400,
        );
      }

      // OAuthトークンの存在確認
      const templateInstances = await db.mcpServerTemplateInstance.findMany({
        where: {
          mcpServerId: { in: body.mcpServerIds },
        },
        include: {
          mcpServerTemplate: {
            select: {
              authType: true,
            },
          },
          oauthTokens: {
            where: {
              userId,
            },
            select: {
              id: true,
            },
          },
        },
      });

      const missingOAuthInstances = templateInstances.filter(
        (instance) =>
          instance.mcpServerTemplate.authType === "OAUTH" &&
          instance.oauthTokens.length === 0,
      );

      if (missingOAuthInstances.length > 0) {
        const instanceNames = missingOAuthInstances
          .map((i) => i.normalizedName)
          .join(", ");
        return c.json(
          createInvalidRequestError(
            `OAuth tokens not found for some instances: ${instanceNames}. Please authenticate first.`,
          ),
          400,
        );
      }
    }

    // トランザクションで更新
    const unifiedServer = await db.$transaction(async (tx) => {
      // 基本情報を更新
      const updateData: {
        name?: string;
        description?: string | null;
      } = {};

      if (body.name !== undefined) {
        updateData.name = body.name.trim();
      }

      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }

      // mcpServerIdsが指定された場合は子サーバーを完全置換
      if (body.mcpServerIds !== undefined) {
        // 既存の関連を削除
        await tx.unifiedMcpServerChild.deleteMany({
          where: { unifiedMcpServerId: unifiedId },
        });

        // 新しい関連を作成
        await tx.unifiedMcpServerChild.createMany({
          data: body.mcpServerIds.map((mcpServerId, index) => ({
            unifiedMcpServerId: unifiedId,
            mcpServerId,
            displayOrder: index,
          })),
        });
      }

      // 更新
      return tx.unifiedMcpServer.update({
        where: { id: unifiedId },
        data: updateData,
        include: {
          childServers: {
            orderBy: { displayOrder: "asc" },
            include: {
              mcpServer: {
                select: {
                  id: true,
                  name: true,
                  serverStatus: true,
                },
              },
            },
          },
        },
      });
    });

    logInfo("Unified MCP server updated", {
      unifiedId: unifiedServer.id,
      name: unifiedServer.name,
    });

    const response: UnifiedMcpServerResponse = {
      id: unifiedServer.id,
      name: unifiedServer.name,
      description: unifiedServer.description,
      organizationId: unifiedServer.organizationId,
      createdBy: unifiedServer.createdBy,
      mcpServers: unifiedServer.childServers.map((child) => ({
        id: child.mcpServer.id,
        name: child.mcpServer.name,
        serverStatus: child.mcpServer.serverStatus,
      })),
      createdAt: unifiedServer.createdAt.toISOString(),
      updatedAt: unifiedServer.updatedAt.toISOString(),
    };

    return c.json(response);
  } catch (error) {
    logError("Failed to update unified MCP server", error as Error);
    return c.json(
      createInvalidRequestError("Failed to update unified MCP server"),
      500,
    );
  }
});

/**
 * 統合MCPサーバー削除（論理削除）
 *
 * DELETE /unified/:id
 *
 * 作成者のみアクセス可能
 */
unifiedCrudRoute.delete("/:id", unifiedOwnershipMiddleware, async (c) => {
  const unifiedId = c.req.param("id");

  try {
    // 論理削除
    await db.unifiedMcpServer.update({
      where: { id: unifiedId },
      data: { deletedAt: new Date() },
    });

    logInfo("Unified MCP server deleted", { unifiedId });

    return c.json({ success: true, message: "Unified MCP server deleted" });
  } catch (error) {
    logError("Failed to delete unified MCP server", error as Error);
    return c.json(
      createInvalidRequestError("Failed to delete unified MCP server"),
      500,
    );
  }
});
