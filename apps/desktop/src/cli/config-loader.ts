/**
 * DBからMCPサーバー設定を読み込むモジュール
 * Desktop側の getEnabledConfigs() と同等の処理をElectron非依存で行う
 */
import type { McpServerConfig } from "@tumiki/mcp-proxy-core";
import { z } from "zod";
import { getDb } from "./db";
import { decryptCredentials } from "./decryptor";

const connectionArgsSchema = z.array(z.string());
const connectionEnvSchema = z.record(z.string(), z.string());

const parseAndValidate = <T>(
  raw: string,
  schema: z.ZodType<T>,
  fieldName: string,
): T => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`${fieldName} is not valid JSON: ${message}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `${fieldName} failed schema validation: ${result.error.message}`,
    );
  }
  return result.data;
};

/**
 * 有効なMCPサーバー設定を取得
 * @param serverSlug 指定時はそのサーバーの接続のみ取得（--server 用）
 */
export const getEnabledConfigs = async (
  serverSlug?: string,
): Promise<McpServerConfig[]> => {
  const db = getDb();
  const connections = await db.mcpConnection.findMany({
    where: {
      isEnabled: true,
      server: {
        isEnabled: true,
        ...(serverSlug ? { slug: serverSlug } : {}),
      },
    },
    include: { server: true },
    orderBy: { displayOrder: "asc" },
  });

  const configs: McpServerConfig[] = [];
  for (const conn of connections) {
    const connLabel = `${conn.server.slug}/${conn.slug}`;

    if (conn.transportType !== "STDIO" || !conn.command) {
      process.stderr.write(
        `[tumiki] ${connLabel}: STDIO以外のため未対応（skip）\n`,
      );
      continue;
    }

    try {
      const args = parseAndValidate(
        conn.args,
        connectionArgsSchema,
        `${connLabel}.args`,
      );
      const plain = await decryptCredentials(conn.credentials);
      const env = parseAndValidate(
        plain,
        connectionEnvSchema,
        `${connLabel}.credentials`,
      );

      configs.push({
        name: `${conn.server.slug}-${conn.slug}`,
        command: conn.command,
        args,
        env,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `[tumiki] ${connLabel}: 設定読み込み失敗（skip）: ${msg}\n`,
      );
    }
  }

  return configs;
};

/**
 * 利用可能なサーバーslug一覧を取得（エラーメッセージ用）
 */
export const getAvailableServerSlugs = async (): Promise<string[]> => {
  const db = getDb();
  const servers = await db.mcpServer.findMany({
    where: { isEnabled: true },
    select: { slug: true },
    orderBy: { displayOrder: "asc" },
  });
  return servers.map((s) => s.slug);
};
