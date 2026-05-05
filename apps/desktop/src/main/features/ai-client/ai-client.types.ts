export type McpEntry = {
  command: string;
  args: string[];
  env?: Record<string, string>;
};

export type AiClientPreview = {
  configPath: string;
  exists: boolean;
  // 既存設定ファイル内のmcpServersに登録済みのslug一覧
  existingServerSlugs: string[];
};

export type AiClientWriteRequest = {
  clientId: string;
  // モーダルのチェックボックスで選ばれた slug → エントリ（追加・上書き対象）
  entries: Record<string, McpEntry>;
  // 既存設定から削除する slug（既存エントリのチェックを外したもの）
  removeSlugs?: string[];
};

export type AiClientWriteResult = {
  configPath: string;
  backupPath: string | null;
  addedCount: number;
  replacedCount: number;
  removedCount: number;
};

export type AiClientWriteErrorCode =
  | "UNSUPPORTED_PLATFORM"
  | "INVALID_JSON"
  | "INVALID_TOML"
  | "PERMISSION_DENIED"
  | "UNKNOWN";
