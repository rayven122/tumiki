/**
 * 統合MCPサーバーCRUD APIルート
 *
 * URL: /unified
 *
 * 統合MCPサーバー（serverType=UNIFIED）の作成・一覧・詳細・更新・削除を行うAPI。
 * JWT認証のみをサポート。
 */

import { Hono } from "hono";
import { AuthType, db, ServerStatus, ServerType } from "@tumiki/db/server";
import type { HonoEnv } from "../types/index.js";
import {
  unifiedCrudJwtAuthMiddleware,
  unifiedOwnershipMiddleware,
} from "../middleware/auth/unifiedCrudJwt.js";
import { logError, logInfo } from "../libs/logger/index.js";
import {
  createInvalidRequestError,
  createNotFoundError,
  createPermissionDeniedError,
} from "../libs/error/index.js";
import { isAdmin } from "../services/roleService.js";
import {
  validateTemplatesInOrganization,
  validateOAuthTokensExist,
  mapToUnifiedMcpServerResponse,
  mapToUnifiedMcpServerListResponse,
} from "../services/unifiedMcp/index.js";
import type {
  CreateUnifiedMcpServerRequest,
  UpdateUnifiedMcpServerRequest,
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
 * - description: string (必須) - 統合サーバーの説明
 * - templates: CreateTemplateInstanceRequest[] (必須、最低1件) - テンプレートインスタンス配列
 *
 * バリデーション:
 * - templatesが空配列の場合はエラー
 * - 指定されたtemplateIdが同一組織内に存在しない場合はエラー
 * - ユーザーがOAuthトークンを持っていないテンプレートが含まれる場合はエラー
 */
unifiedCrudRoute.post("/", async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  const { organizationId, userId } = authContext;

  // 管理者権限チェック（Owner/Adminのみ作成可能）
  const jwtPayload = c.get("jwtPayload");
  const roles = jwtPayload?.realm_access?.roles ?? [];
  if (!isAdmin(roles)) {
    return c.json(
      createPermissionDeniedError(
        "Only Owner or Admin can create unified MCP servers",
      ),
      403,
    );
  }

  try {
    const body = await c.req.json<CreateUnifiedMcpServerRequest>();

    // バリデーション: 名前は必須
    if (!body.name || body.name.trim() === "") {
      return c.json(createInvalidRequestError("name is required"), 400);
    }

    // バリデーション: 説明は必須
    if (!body.description || body.description.trim() === "") {
      return c.json(createInvalidRequestError("description is required"), 400);
    }

    // バリデーション: templatesは最低1件必須
    if (!body.templates || body.templates.length === 0) {
      return c.json(
        createInvalidRequestError(
          "templates must contain at least one template",
        ),
        400,
      );
    }

    // 指定されたテンプレートが同一組織内に存在するか確認
    const templateValidation = await validateTemplatesInOrganization(
      body.templates,
      organizationId,
    );

    if (!templateValidation.valid) {
      return c.json(
        createInvalidRequestError(
          `Some templates not found or not in organization: ${templateValidation.missingIds.join(", ")}`,
        ),
        400,
      );
    }

    // OAuthトークンの存在確認
    const oauthValidation = await validateOAuthTokensExist(
      body.templates,
      userId,
      organizationId,
    );

    if (!oauthValidation.valid) {
      return c.json(
        createInvalidRequestError(
          `OAuth tokens not found for some templates: ${oauthValidation.missingTemplateNames.join(", ")}. Please authenticate first.`,
        ),
        400,
      );
    }

    // 統合MCPサーバーを作成（serverType=UNIFIED の McpServer）
    const unifiedServer = await db.mcpServer.create({
      data: {
        name: body.name.trim(),
        description: body.description.trim(),
        organizationId,
        serverType: ServerType.UNIFIED,
        serverStatus: ServerStatus.RUNNING, // UNIFIEDは常にRUNNING
        authType: AuthType.NONE, // UNIFIEDはauthTypeを継承しない
        templateInstances: {
          create: body.templates.map((template, index) => ({
            mcpServerTemplateId: template.templateId,
            normalizedName: template.normalizedName,
            isEnabled: template.isEnabled ?? true,
            displayOrder: index,
          })),
        },
      },
      include: {
        templateInstances: {
          orderBy: { displayOrder: "asc" },
          include: {
            mcpServerTemplate: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    logInfo("Unified MCP server created", {
      unifiedId: unifiedServer.id,
      name: unifiedServer.name,
      templateInstanceCount: unifiedServer.templateInstances.length,
    });

    const response = mapToUnifiedMcpServerResponse(unifiedServer);

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
 * 同一組織内の統合サーバーをすべて返却（組織メンバー全員がアクセス可能）
 */
unifiedCrudRoute.get("/", async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  const { organizationId } = authContext;

  try {
    const unifiedServers = await db.mcpServer.findMany({
      where: {
        organizationId: organizationId,
        serverType: ServerType.UNIFIED,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        templateInstances: {
          orderBy: { displayOrder: "asc" },
          include: {
            mcpServerTemplate: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const response: UnifiedMcpServerListResponse = {
      items: mapToUnifiedMcpServerListResponse(unifiedServers),
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
 * 組織メンバー全員がアクセス可能
 */
unifiedCrudRoute.get("/:id", unifiedOwnershipMiddleware, async (c) => {
  const unifiedId = c.req.param("id");

  try {
    const unifiedServer = await db.mcpServer.findUnique({
      where: {
        id: unifiedId,
        serverType: ServerType.UNIFIED,
      },
      include: {
        templateInstances: {
          orderBy: { displayOrder: "asc" },
          include: {
            mcpServerTemplate: {
              select: {
                id: true,
                name: true,
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

    const response = mapToUnifiedMcpServerResponse(unifiedServer);

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
 * Owner/Admin のみアクセス可能
 *
 * リクエスト:
 * - name?: string - 統合サーバー名
 * - description?: string - 統合サーバーの説明
 * - templates?: CreateTemplateInstanceRequest[] - テンプレートインスタンス配列（完全置換、最低1件必須）
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

    // templatesが指定された場合のバリデーション
    if (body.templates !== undefined) {
      if (body.templates.length === 0) {
        return c.json(
          createInvalidRequestError(
            "templates must contain at least one template",
          ),
          400,
        );
      }

      // 指定されたテンプレートが同一組織内に存在するか確認
      const templateValidation = await validateTemplatesInOrganization(
        body.templates,
        organizationId,
      );

      if (!templateValidation.valid) {
        return c.json(
          createInvalidRequestError(
            `Some templates not found or not in organization: ${templateValidation.missingIds.join(", ")}`,
          ),
          400,
        );
      }

      // OAuthトークンの存在確認
      const oauthValidation = await validateOAuthTokensExist(
        body.templates,
        userId,
        organizationId,
      );

      if (!oauthValidation.valid) {
        return c.json(
          createInvalidRequestError(
            `OAuth tokens not found for some templates: ${oauthValidation.missingTemplateNames.join(", ")}. Please authenticate first.`,
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
        description?: string;
      } = {};

      if (body.name !== undefined) {
        updateData.name = body.name.trim();
      }

      if (body.description !== undefined) {
        updateData.description = body.description.trim();
      }

      // templatesが指定された場合はテンプレートインスタンスを完全置換
      if (body.templates !== undefined) {
        // 既存のインスタンスを削除
        await tx.mcpServerTemplateInstance.deleteMany({
          where: { mcpServerId: unifiedId },
        });

        // 新しいインスタンスを作成
        await tx.mcpServerTemplateInstance.createMany({
          data: body.templates.map((template, index) => ({
            mcpServerId: unifiedId,
            mcpServerTemplateId: template.templateId,
            normalizedName: template.normalizedName,
            isEnabled: template.isEnabled ?? true,
            displayOrder: index,
          })),
        });
      }

      // 更新
      return tx.mcpServer.update({
        where: {
          id: unifiedId,
          serverType: ServerType.UNIFIED,
        },
        data: updateData,
        include: {
          templateInstances: {
            orderBy: { displayOrder: "asc" },
            include: {
              mcpServerTemplate: {
                select: {
                  id: true,
                  name: true,
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

    const response = mapToUnifiedMcpServerResponse(unifiedServer);

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
 * Owner/Admin のみアクセス可能
 */
unifiedCrudRoute.delete("/:id", unifiedOwnershipMiddleware, async (c) => {
  const unifiedId = c.req.param("id");

  try {
    // 論理削除
    await db.mcpServer.update({
      where: {
        id: unifiedId,
        serverType: ServerType.UNIFIED,
      },
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
