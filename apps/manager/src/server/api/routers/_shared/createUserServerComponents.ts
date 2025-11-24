/**
 * MCPサーバーのユーザー固有コンポーネントを作成する共通関数（新スキーマ）
 *
 * この関数は、Official MCPサーバーとリモートMCPサーバーの両方で使用され、
 * 以下のコンポーネントをトランザクション内で作成します：
 * - McpConfig: ユーザー固有のサーバー設定
 * - McpServer: サーバーインスタンス（allowedToolsとの多対多リレーション）
 * - McpApiKey: APIキー（OAuth認証待ちでない場合）
 *
 * 【新スキーマでの主な変更点】
 * - UserMcpServerConfig → McpConfig
 * - UserToolGroup削除（allowedToolsの多対多リレーションに統合）
 * - UserMcpServerInstance → McpServer
 */

import type { db } from "@tumiki/db/server";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

type CreateUserServerComponentsInput = {
  /** トランザクション対応のPrismaクライアント */
  tx: TransactionClient;
  /** 対象のMCPサーバーテンプレートID */
  mcpServerTemplateId: string;
  /** 対象のツールID配列 */
  allowedToolIds: string[];
  /** ユーザーが入力した環境変数（JSON文字列化前） */
  envVars: Record<string, string>;
  /** インスタンス名（ユーザーが指定） */
  instanceName: string;
  /** インスタンスの説明（オプション） */
  instanceDescription?: string;
  /** 組織ID */
  organizationId: string;
  /** ユーザーID */
  userId: string;
  /** OAuth認証待ちフラグ（trueの場合、APIキーを生成せずPENDINGステータスにする） */
  isPending?: boolean;
};

type CreateUserServerComponentsOutput = {
  /** 作成されたMcpConfig */
  config: { id: string };
  /** 作成されたMcpServer */
  server: { id: string };
};

/**
 * MCPサーバーのユーザー固有コンポーネントを作成（新スキーマ版）
 *
 * @param input - 作成に必要なパラメータ
 * @returns 作成されたコンポーネントのIDを含むオブジェクト
 *
 * @example
 * ```typescript
 * const result = await db.$transaction(async (tx) => {
 *   return await createUserServerComponents({
 *     tx,
 *     mcpServerTemplateId: "template-123",
 *     allowedToolIds: ["tool-1", "tool-2"],
 *     envVars: { API_KEY: "xxx" },
 *     instanceName: "My Server",
 *     organizationId: "org-123",
 *     userId: "user-456",
 *     isPending: false,
 *   });
 * });
 * ```
 */
export const createUserServerComponents = async (
  input: CreateUserServerComponentsInput,
): Promise<CreateUserServerComponentsOutput> => {
  const {
    tx,
    mcpServerTemplateId,
    allowedToolIds,
    envVars,
    instanceName,
    instanceDescription = "",
    organizationId,
    userId,
    isPending = false,
  } = input;

  // 1. McpConfigを作成
  const config = await tx.mcpConfig.create({
    data: {
      organizationId,
      mcpServerTemplateId,
      envVars: JSON.stringify(envVars),
    },
  });

  // 2. APIキーを生成（OAuth認証待ちの場合は生成しない）
  const fullKey = isPending ? undefined : generateApiKey();

  // 3. McpServerを作成（allowedToolsとの多対多リレーション）
  const server = await tx.mcpServer.create({
    data: {
      organizationId,
      name: instanceName,
      description: instanceDescription,
      // OAuth認証待ちの場合はPENDING、それ以外はRUNNING
      serverStatus: isPending ? ServerStatus.PENDING : ServerStatus.RUNNING,
      serverType: ServerType.OFFICIAL,
      // 多対多リレーション: mcpServerTemplatesとallowedToolsを接続
      mcpServerTemplates: {
        connect: { id: mcpServerTemplateId },
      },
      allowedTools: {
        connect: allowedToolIds.map((id) => ({ id })),
      },
      apiKeys:
        isPending || !fullKey
          ? undefined
          : {
              create: {
                name: `${instanceName} API Key`,
                apiKey: fullKey,
                userId,
              },
            },
    },
  });

  return {
    config,
    server,
  };
};
