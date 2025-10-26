import type { GoogleCredentials } from "../utils/googleCredentials.js";

export type TransportConfigStdio = {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type TransportConfigSSE = {
  type: "sse";
  url: string;
  env?: Record<string, string>; // 環境変数（認証ヘッダー設定用）
};

export type TransportConfigStreamableHTTPS = {
  type: "streamable_https";
  url: string;
  env?: Record<string, string>; // 環境変数（認証ヘッダー設定用）
  requireCloudRunAuth?: boolean; // Cloud Run IAM認証が必要かどうか
};

export type TransportConfig =
  | TransportConfigSSE
  | TransportConfigStdio
  | TransportConfigStreamableHTTPS;
export type ServerConfig = {
  name: string;
  toolNames: string[];
  transport: TransportConfig;
  googleCredentials?: GoogleCredentials | null;
};

export type Config = {
  servers: ServerConfig[];
};
