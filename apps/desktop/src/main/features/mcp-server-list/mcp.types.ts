import type {
  McpServer,
  McpConnection,
  McpCatalog,
} from "@prisma/desktop-client";

/**
 * MCPサーバー情報型（IPC通信用）
 * Prisma型を起点に、Date→stringへ変換 + connections を付与
 */
export type McpServerItem = Omit<McpServer, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  connections: McpConnectionItem[];
};

/**
 * MCP接続情報型（IPC通信用）
 * Prisma型を起点に、Date→stringへ変換 + catalog を付与
 */
export type McpConnectionItem = Omit<
  McpConnection,
  "createdAt" | "updatedAt" | "serverId" | "displayOrder"
> & {
  createdAt: string;
  updatedAt: string;
  catalog: Pick<McpCatalog, "id" | "name" | "description" | "iconPath"> | null;
};

/**
 * カタログからMCP登録する際の入力型（renderer → main）
 * preload / ipc / service で共通使用する唯一の定義
 */
export type CreateFromCatalogInput = {
  catalogId: number;
  catalogName: string;
  description: string;
  transportType: McpConnection["transportType"];
  command: string | null;
  args: string;
  url: string | null;
  credentialKeys: string[];
  credentials: Record<string, string>;
  authType: McpConnection["authType"];
};

/**
 * MCPサーバー更新の入力型（renderer → main）
 */
export type UpdateServerInput = {
  id: number;
  name?: string;
  description?: string;
};

/**
 * MCPサーバー削除の入力型（renderer → main）
 */
export type DeleteServerInput = {
  id: number;
};

/**
 * MCPサーバーenabled切り替えの入力型（renderer → main）
 */
export type ToggleServerInput = {
  id: number;
  isEnabled: boolean;
};

/**
 * 仮想MCP作成時の各ツールに対する設定（公開可否・説明上書き）
 */
export type VirtualServerToolInput = {
  // 元MCPから取得したツール名
  name: string;
  // 元の説明（取得時の値、表示用）
  description: string;
  // 入力スキーマJSON文字列（取得時の値）
  inputSchema: string;
  // 公開可否（trueなら公開、falseなら非公開）
  isAllowed: boolean;
  // カスタム説明（未指定または空文字なら元の説明を使用）
  customDescription?: string;
};

/**
 * 仮想MCP作成における1接続分の入力型
 * 既存コネクタのMcpConnection IDを参照し、その設定（credentials/transport等）をコピーする
 */
export type VirtualServerConnectionInput = {
  // 既存のMcpConnection ID（コネクト画面で追加済みのコネクタを選択）
  connectionId: number;
  // 取得済みツール一覧（fetchToolsForConnectionsの結果ベース）
  // 省略可能（後方互換のため）。指定があればMcpToolレコードを生成する
  tools?: VirtualServerToolInput[];
};

/**
 * 仮想MCP作成の入力型（renderer → main）
 * 1つのMcpServerに対して複数のMcpConnectionを束ねて公開する
 * 各接続は既存コネクタ（McpConnection）の設定をコピーして生成される
 */
export type CreateVirtualServerInput = {
  name: string;
  description: string;
  connections: VirtualServerConnectionInput[];
};

/**
 * fetchToolsForConnections の入力（renderer → main）
 * 既存コネクタの credentials を再利用してツール一覧を取得する
 */
export type FetchToolsInput = {
  connectionIds: number[];
};

/**
 * fetchToolsForConnections の出力（main → renderer）
 */
export type FetchToolsResult = {
  items: Array<{
    connectionId: number;
    tools: Array<{
      name: string;
      description: string;
      inputSchema: string;
    }>;
    error?: string;
  }>;
};
