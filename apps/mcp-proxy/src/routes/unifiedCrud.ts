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
  CreateTemplateInstanceRequest,
  UnifiedMcpServerListResponse,
} from "../services/unifiedMcp/types.js";

export const unifiedCrudRoute = new Hono<HonoEnv>();

// 全エンドポイントにJWT認証を適用
unifiedCrudRoute.use("/*", unifiedCrudJwtAuthMiddleware);

/** テンプレートインスタンス取得用のinclude設定 */
const TEMPLATE_INSTANCES_INCLUDE = {
  templateInstances: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      mcpServerTemplate: {
        select: { id: true, name: true },
      },
    },
  },
};

/**
 * テンプレート配列のバリデーション
 */
const validateTemplates = async (
  templates: CreateTemplateInstanceRequest[],
  organizationId: string,
  userId: string,
): Promise<{ valid: true } | { valid: false; error: string }> => {
  // テンプレートが同一組織内に存在するか確認
  const templateValidation = await validateTemplatesInOrganization(
    templates,
    organizationId,
  );

  if (!templateValidation.valid) {
    return {
      valid: false,
      error: `Some templates not found or not in organization: ${templateValidation.missingIds.join(", ")}`,
    };
  }

  // OAuthトークンの存在確認
  const oauthValidation = await validateOAuthTokensExist(
    templates,
    userId,
    organizationId,
  );

  if (!oauthValidation.valid) {
    return {
      valid: false,
      error: `OAuth tokens not found for some templates: ${oauthValidation.missingTemplateNames.join(", ")}. Please authenticate first.`,
    };
  }

  return { valid: true };
};

/**
 * 統合MCPサーバー作成
 * POST /unified
 */
unifiedCrudRoute.post("/", async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  const { organizationId, userId } = authContext;

  // 管理者権限チェック
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

    // 必須フィールドのバリデーション
    if (!body.name?.trim()) {
      return c.json(createInvalidRequestError("name is required"), 400);
    }

    if (!body.description?.trim()) {
      return c.json(createInvalidRequestError("description is required"), 400);
    }

    if (!body.templates?.length) {
      return c.json(
        createInvalidRequestError(
          "templates must contain at least one template",
        ),
        400,
      );
    }

    // テンプレートのバリデーション
    const validationResult = await validateTemplates(
      body.templates,
      organizationId,
      userId,
    );

    if (!validationResult.valid) {
      return c.json(createInvalidRequestError(validationResult.error), 400);
    }

    // 統合MCPサーバーを作成
    const unifiedServer = await db.mcpServer.create({
      data: {
        name: body.name.trim(),
        description: body.description.trim(),
        organizationId,
        serverType: ServerType.UNIFIED,
        serverStatus: ServerStatus.RUNNING,
        authType: AuthType.NONE,
        templateInstances: {
          create: body.templates.map((template, index) => ({
            mcpServerTemplateId: template.templateId,
            normalizedName: template.normalizedName,
            isEnabled: template.isEnabled ?? true,
            displayOrder: index,
          })),
        },
      },
      include: TEMPLATE_INSTANCES_INCLUDE,
    });

    logInfo("Unified MCP server created", {
      unifiedId: unifiedServer.id,
      name: unifiedServer.name,
      templateInstanceCount: unifiedServer.templateInstances.length,
    });

    return c.json(mapToUnifiedMcpServerResponse(unifiedServer), 201);
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
 * GET /unified
 */
unifiedCrudRoute.get("/", async (c) => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createInvalidRequestError("Authentication required"), 401);
  }

  try {
    const unifiedServers = await db.mcpServer.findMany({
      where: {
        organizationId: authContext.organizationId,
        serverType: ServerType.UNIFIED,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: TEMPLATE_INSTANCES_INCLUDE,
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
 * GET /unified/:id
 */
unifiedCrudRoute.get("/:id", unifiedOwnershipMiddleware, async (c) => {
  const unifiedId = c.req.param("id");

  try {
    const unifiedServer = await db.mcpServer.findUnique({
      where: {
        id: unifiedId,
        serverType: ServerType.UNIFIED,
      },
      include: TEMPLATE_INSTANCES_INCLUDE,
    });

    if (!unifiedServer) {
      return c.json(
        createNotFoundError(`Unified MCP Server not found: ${unifiedId}`),
        404,
      );
    }

    return c.json(mapToUnifiedMcpServerResponse(unifiedServer));
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
 * PUT /unified/:id
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

      const validationResult = await validateTemplates(
        body.templates,
        organizationId,
        userId,
      );

      if (!validationResult.valid) {
        return c.json(createInvalidRequestError(validationResult.error), 400);
      }
    }

    // トランザクションで更新
    const unifiedServer = await db.$transaction(async (tx) => {
      const updateData: { name?: string; description?: string } = {};

      if (body.name !== undefined) {
        updateData.name = body.name.trim();
      }

      if (body.description !== undefined) {
        updateData.description = body.description.trim();
      }

      // templatesが指定された場合はテンプレートインスタンスを完全置換
      if (body.templates !== undefined) {
        await tx.mcpServerTemplateInstance.deleteMany({
          where: { mcpServerId: unifiedId },
        });

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

      return tx.mcpServer.update({
        where: {
          id: unifiedId,
          serverType: ServerType.UNIFIED,
        },
        data: updateData,
        include: TEMPLATE_INSTANCES_INCLUDE,
      });
    });

    logInfo("Unified MCP server updated", {
      unifiedId: unifiedServer.id,
      name: unifiedServer.name,
    });

    return c.json(mapToUnifiedMcpServerResponse(unifiedServer));
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
 * DELETE /unified/:id
 */
unifiedCrudRoute.delete("/:id", unifiedOwnershipMiddleware, async (c) => {
  const unifiedId = c.req.param("id");

  try {
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
