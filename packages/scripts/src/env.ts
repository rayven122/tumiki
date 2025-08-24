import { z } from "zod";

import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * MCPサーバーから必要な環境変数を抽出
 * envVarsが定義されていないサーバーはスキップ
 */
const collectRequiredEnvVars = () => {
  const envVarsSet = new Set<string>();

  for (const server of MCP_SERVERS) {
    if ("envVars" in server && Array.isArray(server.envVars)) {
      for (const envVar of server.envVars) {
        envVarsSet.add(envVar);
      }
    }
  }

  return Array.from(envVarsSet);
};

const requiredMcpEnvVars = collectRequiredEnvVars();

/**
 * MCPサーバー登録スクリプト用の環境変数スキーマ
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string({
      required_error: "DATABASE_URL is required",
      invalid_type_error: "DATABASE_URL must be a string",
    })
    .url({
      message: "DATABASE_URL must be a valid PostgreSQL connection URL",
    })
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      {
        message: "DATABASE_URL must be a PostgreSQL connection URL",
      },
    ),
  // MCPサーバーで必要な環境変数（オプション）
  // 空文字列は未定義として扱う
  ...Object.fromEntries(
    requiredMcpEnvVars.map((envVar) => [
      envVar,
      z
        .string()
        .optional()
        .transform((val) => (val === "" ? undefined : val)),
    ]),
  ),
});

type Env = z.infer<typeof envSchema>;

/**
 * 環境変数をバリデーションして返す
 * @throws {z.ZodError} 環境変数が不正な場合
 */
export const validateEnv = (): Env => {
  try {
    const env = envSchema.parse(process.env);

    // 環境変数が定義されているMCPサーバーのみ、最低1つの環境変数が設定されているかチェック
    // envVarsが定義されていないサーバー（Context7、Playwrightなど）はスキップ
    const serversWithMissingEnvVars: string[] = [];

    for (const server of MCP_SERVERS) {
      if ("envVars" in server && server.envVars.length > 0) {
        const hasAtLeastOneEnvVar = server.envVars.some((envVar: string) => {
          const value = env[envVar as keyof Env];
          // 環境変数はoptionalなので、値が存在し空でないことを確認
          return value && value !== "";
        });

        if (!hasAtLeastOneEnvVar) {
          // 複数の環境変数がある場合は「いずれか」を明記
          const envVarMessage =
            server.envVars.length > 1
              ? `次の環境変数のうち少なくとも1つが必要です: ${server.envVars.join(", ")}`
              : `次の環境変数が必要です: ${server.envVars.join(", ")}`;

          serversWithMissingEnvVars.push(
            `  • ${server.name}: ${envVarMessage}`,
          );
        }
      }
    }

    // 環境変数が不足しているサーバーがある場合は、まとめて警告を表示
    if (serversWithMissingEnvVars.length > 0) {
      console.warn(
        "⚠️  以下のMCPサーバーは環境変数が設定されていないため、ツール登録がスキップされます:",
      );
      console.warn("");
      serversWithMissingEnvVars.forEach((msg) => console.warn(msg));
      console.warn("");
      console.warn(
        "これらのサーバーを使用する場合は、.env.upsert ファイルに環境変数を設定してください。",
      );
      console.warn("");
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ 環境変数の検証に失敗しました:");
      console.error("");

      error.errors.forEach((err) => {
        console.error(`  • ${err.path.join(".")}: ${err.message}`);
      });

      console.error("");
      console.error("📝 必要な環境変数:");
      console.error("  DATABASE_URL - PostgreSQLデータベースの接続URL (必須)");
      console.error("");
      console.error("📦 MCPサーバー用の環境変数（オプション）:");
      console.error(
        "  各MCPサーバーを使用する場合は、対応する環境変数を設定してください。",
      );
      console.error(
        "  環境変数が設定されていないサーバーは自動的にスキップされます。",
      );
      console.error("");

      for (const server of MCP_SERVERS) {
        if ("envVars" in server && server.envVars.length > 0) {
          console.error(`  ${server.name}:`);
          server.envVars.forEach((envVar: string) => {
            console.error(`    - ${envVar}`);
          });
        }
      }

      console.error("");
      console.error("💡 設定方法:");
      console.error(
        "  1. packages/scripts/.env.upsert.example を packages/scripts/.env.upsert にコピー",
      );
      console.error("  2. .env.upsert ファイルに必要な環境変数を設定");
      console.error("  3. 再度コマンドを実行");

      process.exit(1);
    }

    throw error;
  }
};

/**
 * 環境変数が設定されているMCPサーバーのみを返す
 * @param env 検証済みの環境変数
 * @returns 有効なMCPサーバーの配列
 */
export const getValidMcpServers = (env: Env) => {
  return MCP_SERVERS.filter((server) => {
    // envVarsが定義されていないサーバーは常に有効
    if (!("envVars" in server)) {
      return true;
    }

    // 少なくとも1つの環境変数が設定されているかチェック
    return server.envVars.some((envVar: string) => {
      const value = env[envVar as keyof Env];
      return value && value !== "";
    });
  });
};

export type { Env };
