import type { ServerType } from "@prisma/desktop-client";

/**
 * MCP接続のconfig name（AIクライアントに公開するサーバー識別子）を組み立てる共通ヘルパー。
 *
 * - 単独コネクタ（OFFICIAL かつ server.slug === conn.slug）は connSlug のみに短縮
 * - 仮想MCP（CUSTOM、または server.slug !== conn.slug の OFFICIAL）は `serverSlug-connSlug`
 *
 * proxy 起動時の config name（mcp-proxy.service）と Dynamic Search の prefixed tool name
 * （tool-search.service）で必ず同じ値を返す必要があり、両者の判定が乖離すると AI クライアント
 * からのツール呼び出しがサイレントに失敗する。ロジックを一箇所に集約するための関数。
 *
 * `serverType` は Prisma スキーマ由来の enum を再利用し、スキーマ変更時のサイレント乖離を防ぐ。
 */
export type ConfigNameInput = {
  slug: string;
  server: {
    slug: string;
    serverType: ServerType;
  };
};

export const buildMcpConfigName = (conn: ConfigNameInput): string => {
  const isStandaloneConnection =
    conn.server.serverType === "OFFICIAL" && conn.server.slug === conn.slug;
  return isStandaloneConnection
    ? conn.slug
    : `${conn.server.slug}-${conn.slug}`;
};
