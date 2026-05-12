import type {
  McpServer,
  McpConnection,
  McpCatalog,
} from "@prisma/desktop-client";
import type {
  CatalogConnectionTemplate,
  CatalogPermissions,
  CatalogStatus,
} from "../../../types/catalog";

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
 * `secretId` は内部キーのため renderer に公開しない。
 * credentials は IPC 戻り値に含めない（入力時のフォーム以外で renderer に渡す要件はないため）
 */
export type McpConnectionItem = Omit<
  McpConnection,
  "createdAt" | "updatedAt" | "serverId" | "displayOrder" | "secretId"
> & {
  createdAt: string;
  updatedAt: string;
  catalog: Pick<McpCatalog, "id" | "name" | "description" | "iconPath"> | null;
  /** この接続が提供するツールの件数（一覧画面のサマリ表示用） */
  toolCount: number;
  /**
   * 共有している McpSecret.needsReauth の値。refresh_token 失効を検知した時 true になり、
   * 一覧カードのバッジ表示や ToolDetail の警告バナーで利用する。
   */
  needsReauth: boolean;
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
 * Manager APIカタログからMCP登録する際の入力型（renderer → main）
 * ローカルMcpCatalogとは紐づけず、作成されるMcpConnection.catalogIdはnullにする。
 */
export type CreateFromManagerCatalogInput = {
  catalogId: string;
  serverName: string;
  description: string;
  status: CatalogStatus;
  permissions: CatalogPermissions;
  connectionTemplate: CatalogConnectionTemplate;
  tools: Array<{
    name: string;
    allowed: boolean;
  }>;
  credentials: Record<string, string>;
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
 * PIIマスキング有効状態の更新入力型（renderer → main）
 * 反映は次回プロキシ起動時。即時反映はしない。
 */
export type UpdatePiiMaskingInput = {
  serverId: number;
  enabled: boolean;
};

/**
 * TOON変換（レスポンス圧縮）有効状態の更新入力型（renderer → main）
 * 反映は次回プロキシ起動時。即時反映はしない。
 */
export type UpdateToonConversionInput = {
  serverId: number;
  enabled: boolean;
};

/**
 * STDIO通信のカスタムMCPサーバー入力型
 * OAuthは不可（ローカルプロセスのため）
 */
type StdioCustomServerInput = {
  serverName: string;
  transportType: "STDIO";
  authType: "NONE" | "BEARER" | "API_KEY";
  credentials: Record<string, string>;
  command: string;
  args?: string;
};

/**
 * リモート通信（SSE / Streamable HTTP）のカスタムMCPサーバー入力型
 */
type RemoteCustomServerInput = {
  serverName: string;
  transportType: "SSE" | "STREAMABLE_HTTP";
  authType: "NONE" | "BEARER" | "API_KEY" | "OAUTH";
  credentials: Record<string, string>;
  url: string;
};

/**
 * カスタムMCPサーバーを登録する際の入力型（renderer → main）
 * カタログ参照なしで、ユーザーが自由にURL or コマンドを指定して追加する
 */
export type CreateCustomServerInput =
  | StdioCustomServerInput
  | RemoteCustomServerInput;

/**
 * 仮想MCP作成における1接続分の入力型
 *
 * 既存の McpConnection（コネクト画面で追加済みのコネクタ）を束ねる構造に変更。
 * 認証情報は元コネクタの暗号化済み credentials をそのままコピーするため再入力不要。
 * `allowedToolNames` は元コネクタの McpTool.isAllowed をデフォルトとして UI が初期化し、
 * ユーザー編集後に「公開する」ツール名のみを送ってくる想定。省略時は元コネクタの設定をそのまま継承。
 */
export type VirtualServerConnectionInput = {
  connectionId: number;
  /** 公開するツール名一覧（省略時は元コネクタの isAllowed をそのまま継承） */
  allowedToolNames?: string[];
};

/**
 * 仮想MCP作成の入力型（renderer → main）
 * 1つのMcpServerに対して複数のMcpConnectionを束ねて公開する
 */
export type CreateVirtualServerInput = {
  name: string;
  description: string;
  connections: VirtualServerConnectionInput[];
};

/**
 * 仮想MCP作成のツール選択UI向け、選択中コネクタのツール一覧取得入力
 */
export type GetToolsForConnectionsInput = {
  connectionIds: number[];
};

/**
 * 仮想MCP作成のツール選択UIに渡すツール情報（接続単位）
 * `isAllowed` は元コネクタでの設定値で、UI 上の初期チェック状態として利用する
 */
export type ConnectionToolsResult = {
  connectionId: number;
  tools: Array<{
    name: string;
    description: string;
    isAllowed: boolean;
  }>;
};

export type GetToolsForConnectionsResult = {
  items: ConnectionToolsResult[];
};
