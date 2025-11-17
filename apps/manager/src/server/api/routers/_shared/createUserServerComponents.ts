/**
 * MCPサーバーのユーザー固有コンポーネントを作成する共通関数
 *
 * この関数は、Official MCPサーバーとリモートMCPサーバーの両方で使用され、
 * 以下のコンポーネントをトランザクション内で作成します：
 * - UserMcpServerConfig: ユーザー固有のサーバー設定
 * - UserToolGroup: ツールグループ
 * - ToolGroupTools: ツールとツールグループの関連付け
 * - UserMcpServerInstance: サーバーインスタンス
 * - McpApiKey: APIキー（OAuth認証待ちでない場合）
 */

import type { db } from "@tumiki/db/server";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

type CreateUserServerComponentsInput = {
  /** トランザクション対応のPrismaクライアント */
  tx: TransactionClient;
  /** 対象のMCPサーバー（toolsを含む） */
  mcpServer: {
    id: string;
    tools: Array<{ id: string }>;
  };
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
  /** 作成されたUserMcpServerConfig */
  serverConfig: { id: string };
  /** 作成されたUserToolGroup */
  toolGroup: { id: string };
  /** 作成されたUserMcpServerInstance */
  instance: { id: string };
};

/**
 * MCPサーバーのユーザー固有コンポーネントを作成
 *
 * @param input - 作成に必要なパラメータ
 * @returns 作成されたコンポーネントのIDを含むオブジェクト
 *
 * @example
 * ```typescript
 * const result = await db.$transaction(async (tx) => {
 *   return await createUserServerComponents({
 *     tx,
 *     mcpServer,
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
    mcpServer,
    envVars,
    instanceName,
    instanceDescription = "",
    organizationId,
    userId,
    isPending = false,
  } = input;

  // 1. UserMcpServerConfigを作成
  const serverConfig = await tx.userMcpServerConfig.create({
    data: {
      organizationId,
      name: instanceName,
      description: "",
      mcpServerId: mcpServer.id,
      envVars: JSON.stringify(envVars),
    },
  });

  // 2. ツールとツールグループの関連付けデータを準備
  const toolGroupTools = mcpServer.tools.map((tool) => ({
    toolId: tool.id,
    userMcpServerConfigId: serverConfig.id,
  }));

  // 3. UserToolGroupを作成
  const toolGroup = await tx.userToolGroup.create({
    data: {
      organizationId,
      name: instanceName,
      description: "",
      toolGroupTools: {
        createMany: {
          data: toolGroupTools,
        },
      },
    },
  });

  // 4. APIキーを生成（OAuth認証待ちの場合は生成しない）
  const fullKey = isPending ? undefined : generateApiKey();

  // 5. UserMcpServerInstanceを作成
  const instance = await tx.userMcpServerInstance.create({
    data: {
      organizationId,
      name: instanceName,
      description: instanceDescription,
      // OAuth認証待ちの場合はPENDING、それ以外はRUNNING
      serverStatus: isPending ? ServerStatus.PENDING : ServerStatus.RUNNING,
      serverType: ServerType.OFFICIAL,
      toolGroupId: toolGroup.id,
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
    serverConfig,
    toolGroup,
    instance,
  };
};
