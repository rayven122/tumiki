import type { PrismaTransactionClient } from "@tumiki/db";
import { TransportType, AuthType } from "@tumiki/db/server";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { TRPCError } from "@trpc/server";
import {
  getMcpServerToolsHTTP,
  getMcpServerToolsSSE,
} from "@/features/mcps/utils/getMcpServerTools";
import type { McpServerId } from "@/schema/ids";

// ツール変更の種類
export type ToolChangeType = "added" | "removed" | "modified" | "unchanged";

// 個別のツール変更情報
export type ToolChange = {
  type: ToolChangeType;
  name: string;
  description?: string;
  // 変更の場合は変更前後の情報
  previousDescription?: string;
  previousInputSchema?: Record<string, unknown>;
};

// テンプレートインスタンスごとの変更結果
export type TemplateInstanceToolChanges = {
  templateInstanceId: string;
  templateName: string;
  changes: ToolChange[];
  hasChanges: boolean;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
};

// refreshTools の入力型
export type RefreshToolsInput = {
  mcpServerId: McpServerId;
  organizationId: string;
  userId: string;
  /** プレビューモード: trueの場合はDBに反映せず差分のみ返す */
  dryRun?: boolean;
};

// 影響を受ける組織の情報
export type AffectedOrganization = {
  organizationId: string;
  mcpServerId: string;
  mcpServerName: string;
};

// refreshTools の出力型
export type RefreshToolsOutput = {
  success: boolean;
  templateInstances: TemplateInstanceToolChanges[];
  totalAddedCount: number;
  totalRemovedCount: number;
  totalModifiedCount: number;
  hasAnyChanges: boolean;
  // 影響を受ける他の組織（通知送信用）
  affectedOrganizations: AffectedOrganization[];
};

/**
 * JSON オブジェクトを正規化して比較可能にする
 */
export const normalizeJson = (obj: unknown): string => {
  if (obj === null || obj === undefined) {
    return "";
  }
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  return JSON.stringify(obj, Object.keys(obj).sort());
};

/**
 * ツールの内容が変更されたかチェック
 */
export const isToolModified = (
  existingTool: { description: string; inputSchema: unknown },
  newTool: Tool,
): boolean => {
  const newDescription = newTool.description ?? "";
  if (existingTool.description !== newDescription) {
    return true;
  }

  const existingSchema = normalizeJson(existingTool.inputSchema);
  const newSchema = normalizeJson(newTool.inputSchema);
  return existingSchema !== newSchema;
};

/**
 * ツール変更を検出
 */
export const detectToolChanges = (
  existingTools: Array<{
    id: string;
    name: string;
    description: string;
    inputSchema: unknown;
  }>,
  newTools: Tool[],
): {
  changes: ToolChange[];
  toConnect: string[];
  toDisconnect: string[];
  toUpdate: Array<{ id: string; tool: Tool }>;
  toCreate: Tool[];
} => {
  const existingToolMap = new Map(existingTools.map((t) => [t.name, t]));
  const newToolMap = new Map(newTools.map((t) => [t.name, t]));

  const changes: ToolChange[] = [];
  const toConnect: string[] = [];
  const toDisconnect: string[] = [];
  const toUpdate: Array<{ id: string; tool: Tool }> = [];
  const toCreate: Tool[] = [];

  // 新しいツールを確認（追加・変更・変更なし）
  for (const newTool of newTools) {
    const existingTool = existingToolMap.get(newTool.name);

    if (!existingTool) {
      // 新規追加
      changes.push({
        type: "added",
        name: newTool.name,
        description: newTool.description,
      });
      toCreate.push(newTool);
      continue;
    }

    // 既存ツールは再接続対象
    toConnect.push(existingTool.id);

    // 変更があれば更新対象に追加
    if (isToolModified(existingTool, newTool)) {
      changes.push({
        type: "modified",
        name: newTool.name,
        description: newTool.description,
        previousDescription: existingTool.description,
        previousInputSchema: existingTool.inputSchema as Record<
          string,
          unknown
        >,
      });
      toUpdate.push({ id: existingTool.id, tool: newTool });
    } else {
      // 変更なし
      changes.push({
        type: "unchanged",
        name: newTool.name,
        description: newTool.description,
      });
    }
  }

  // 削除されたツールを確認
  for (const existingTool of existingTools) {
    if (!newToolMap.has(existingTool.name)) {
      changes.push({
        type: "removed",
        name: existingTool.name,
        description: existingTool.description,
      });
      toDisconnect.push(existingTool.id);
    }
  }

  return { changes, toConnect, toDisconnect, toUpdate, toCreate };
};

/**
 * MCPサーバーからツールを取得するためのヘッダーを構築
 */
export const buildHeaders = async (
  tx: PrismaTransactionClient,
  params: {
    templateInstanceId: string;
    userId: string;
    organizationId: string;
    authType: AuthType;
  },
): Promise<Record<string, string>> => {
  const { templateInstanceId, userId, organizationId, authType } = params;

  // 認証不要の場合は空のヘッダー
  if (authType === AuthType.NONE) {
    return {};
  }

  // OAuth認証の場合はトークンを取得
  if (authType === AuthType.OAUTH) {
    const oauthToken = await tx.mcpOAuthToken.findFirst({
      where: {
        mcpServerTemplateInstanceId: templateInstanceId,
        userId,
        organizationId,
      },
    });

    if (!oauthToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "OAuth認証が必要です。先にMCPサーバーの認証を完了してください。",
      });
    }

    return { Authorization: `Bearer ${oauthToken.accessToken}` };
  }

  // APIキー認証の場合はMcpConfigから環境変数を取得
  if (authType === AuthType.API_KEY) {
    // envVarsはomitでデフォルト除外されているため、selectで明示的に指定
    const mcpConfig = await tx.mcpConfig.findFirst({
      where: {
        mcpServerTemplateInstanceId: templateInstanceId,
        organizationId,
        // ユーザー個別設定を優先、なければ組織共通設定
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { userId: "desc" }, // ユーザー設定を優先
      select: { envVars: true },
    });

    if (mcpConfig?.envVars) {
      try {
        return JSON.parse(mcpConfig.envVars) as Record<string, string>;
      } catch {
        return {};
      }
    }
  }

  return {};
};

/**
 * MCPサーバーのツールを再取得して同期
 */
export const refreshTools = async (
  tx: PrismaTransactionClient,
  input: RefreshToolsInput,
): Promise<RefreshToolsOutput> => {
  const { mcpServerId, organizationId, userId, dryRun = false } = input;

  // MCPサーバーとテンプレートインスタンスを取得
  const mcpServer = await tx.mcpServer.findUnique({
    where: {
      id: mcpServerId,
      organizationId,
      deletedAt: null,
    },
    include: {
      templateInstances: {
        include: {
          mcpServerTemplate: {
            include: {
              mcpTools: true,
            },
          },
          allowedTools: true,
        },
      },
    },
  });

  if (!mcpServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  const templateInstanceResults: TemplateInstanceToolChanges[] = [];

  // 各テンプレートインスタンスごとにツールを再取得
  for (const instance of mcpServer.templateInstances) {
    const template = instance.mcpServerTemplate;

    // リモートMCPサーバーのみ対応（STDIOはスキップ）
    if (template.transportType === TransportType.STDIO || !template.url) {
      templateInstanceResults.push({
        templateInstanceId: instance.id,
        templateName: template.name,
        changes: [],
        hasChanges: false,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
        unchangedCount: 0,
      });
      continue;
    }

    // ヘッダーを構築
    const headers = await buildHeaders(tx, {
      templateInstanceId: instance.id,
      userId,
      organizationId,
      authType: template.authType,
    });

    // MCPサーバーからツールを取得
    const newTools =
      template.transportType === TransportType.SSE
        ? await getMcpServerToolsSSE(
            { name: template.name, url: template.url },
            headers,
          )
        : await getMcpServerToolsHTTP(
            { name: template.name, url: template.url },
            headers,
            template.useCloudRunIam,
          );

    if (newTools.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `MCPサーバー「${template.name}」からツールを取得できませんでした。サーバーが正常に動作しているか確認してください。`,
      });
    }

    // 既存ツールと新しいツールを比較
    const { changes, toConnect, toDisconnect, toUpdate, toCreate } =
      detectToolChanges(template.mcpTools, newTools);

    // dryRunモードでない場合のみDB更新を実行
    if (!dryRun) {
      // 新しいツールをデータベースに作成
      const createdToolIds: string[] = [];
      if (toCreate.length > 0) {
        const createdTools = await tx.mcpTool.createManyAndReturn({
          data: toCreate.map((tool) => ({
            name: tool.name,
            description: tool.description ?? "",
            inputSchema: tool.inputSchema as object,
            mcpServerTemplateId: template.id,
          })),
          select: { id: true },
        });
        createdToolIds.push(...createdTools.map((t) => t.id));
      }

      // 既存ツールを更新
      for (const { id, tool } of toUpdate) {
        await tx.mcpTool.update({
          where: { id },
          data: {
            description: tool.description ?? "",
            inputSchema: tool.inputSchema as object,
          },
        });
      }

      // allowedTools を差分更新（set ではなく connect/disconnect を使用）
      const existingAllowedToolIds = new Set(
        instance.allowedTools.map((t) => t.id),
      );

      // 新しく追加するツール（createdToolIds + toConnect で既存allowedToolsにないもの）
      const allNewToolIds = [...toConnect, ...createdToolIds];
      const toConnectIds = allNewToolIds.filter(
        (id) => !existingAllowedToolIds.has(id),
      );
      // 削除するツール
      const toDisconnectIds = toDisconnect.filter((id) =>
        existingAllowedToolIds.has(id),
      );

      // 差分更新を実行
      if (toConnectIds.length > 0 || toDisconnectIds.length > 0) {
        await tx.mcpServerTemplateInstance.update({
          where: { id: instance.id },
          data: {
            allowedTools: {
              ...(toConnectIds.length > 0 && {
                connect: toConnectIds.map((id) => ({ id })),
              }),
              ...(toDisconnectIds.length > 0 && {
                disconnect: toDisconnectIds.map((id) => ({ id })),
              }),
            },
          },
        });
      }

      // MCPサーバーが提供しなくなったツールを削除
      // 同じテンプレートを使用する他のインスタンスからも削除される（正しい動作）
      if (toDisconnect.length > 0) {
        await tx.mcpTool.deleteMany({
          where: {
            id: { in: toDisconnect },
          },
        });
      }
    }

    // 変更カウントを集計
    const counts = changes.reduce(
      (acc, c) => {
        acc[c.type]++;
        return acc;
      },
      { added: 0, removed: 0, modified: 0, unchanged: 0 },
    );

    // hasChanges は追加・削除・変更があった場合のみ true
    const hasActualChanges =
      counts.added > 0 || counts.removed > 0 || counts.modified > 0;

    templateInstanceResults.push({
      templateInstanceId: instance.id,
      templateName: template.name,
      changes,
      hasChanges: hasActualChanges,
      addedCount: counts.added,
      removedCount: counts.removed,
      modifiedCount: counts.modified,
      unchangedCount: counts.unchanged,
    });
  }

  const totalAddedCount = templateInstanceResults.reduce(
    (sum, r) => sum + r.addedCount,
    0,
  );
  const totalRemovedCount = templateInstanceResults.reduce(
    (sum, r) => sum + r.removedCount,
    0,
  );
  const totalModifiedCount = templateInstanceResults.reduce(
    (sum, r) => sum + r.modifiedCount,
    0,
  );
  const hasAnyChanges = templateInstanceResults.some((r) => r.hasChanges);

  // 変更があった場合、同じテンプレートを使用している他の組織を特定
  let affectedOrganizations: AffectedOrganization[] = [];
  if (hasAnyChanges) {
    // 変更があったテンプレートIDを収集
    const changedTemplateIds = templateInstanceResults
      .filter((r) => r.hasChanges)
      .map((r) => {
        const instance = mcpServer.templateInstances.find(
          (i) => i.id === r.templateInstanceId,
        );
        return instance?.mcpServerTemplate.id;
      })
      .filter((id): id is string => id !== undefined);

    if (changedTemplateIds.length > 0) {
      // 同じテンプレートを使用している他の組織のMCPサーバーを検索
      const otherServers = await tx.mcpServer.findMany({
        where: {
          id: { not: mcpServerId },
          organizationId: { not: organizationId },
          deletedAt: null,
          templateInstances: {
            some: {
              mcpServerTemplateId: { in: changedTemplateIds },
            },
          },
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
        distinct: ["organizationId"],
      });

      affectedOrganizations = otherServers.map((server) => ({
        organizationId: server.organizationId,
        mcpServerId: server.id,
        mcpServerName: server.name,
      }));
    }
  }

  return {
    success: true,
    templateInstances: templateInstanceResults,
    totalAddedCount,
    totalRemovedCount,
    totalModifiedCount,
    hasAnyChanges,
    affectedOrganizations,
  };
};
