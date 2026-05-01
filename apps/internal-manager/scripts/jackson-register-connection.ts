#!/usr/bin/env tsx
/**
 * saml-jackson に SAML/OIDC Connection を登録するスクリプト
 *
 * 使い方:
 *   pnpm tsx scripts/jackson-register-connection.ts <metadata-xml-path>
 *
 * 環境変数:
 *   - INTERNAL_DATABASE_URL: jackson が使う PostgreSQL
 *   - JACKSON_ENCRYPTION_KEY: 32 文字以上の暗号化キー
 *   - NEXTAUTH_URL_INTERNAL_MANAGER: アプリの公開 URL（saml-jackson の externalUrl）
 *   - JACKSON_TENANT: テナント識別子（デフォルト "default"）
 *   - JACKSON_PRODUCT: プロダクト識別子（デフォルト "tumiki"）
 *
 * 出力:
 *   登録完了後、以下を環境変数に設定する:
 *   - OIDC_CLIENT_ID: <出力された clientID>
 *   - OIDC_CLIENT_SECRET: <出力された clientSecret>
 *   - OIDC_ISSUER: <NEXTAUTH_URL_INTERNAL_MANAGER>
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getJackson, resolveExternalUrl } from "../src/server/jackson";

const main = async () => {
  const metadataPath = process.argv[2];
  if (!metadataPath) {
    console.error(
      "Usage: tsx scripts/jackson-register-connection.ts <metadata-xml-path>",
    );
    process.exit(1);
  }

  const tenant = process.env.JACKSON_TENANT ?? "default";
  const product = process.env.JACKSON_PRODUCT ?? "tumiki";
  // モジュールと同じ解決ロジックを使用（不一致防止）
  const externalUrl = resolveExternalUrl();

  const rawMetadata = await readFile(resolve(metadataPath), "utf-8");

  const { connectionAPIController } = await getJackson();

  // 同 tenant/product の既存接続を取得
  const existing = await connectionAPIController.getConnections({
    tenant,
    product,
  });

  if (existing.length > 0) {
    console.log(
      `[INFO] Existing connection found for ${tenant}/${product}, will be updated`,
    );
  }

  // Open Redirect 対策のため、redirectUrl はワイルドカードではなく
  // 具体的なコールバックパスのみを許可する
  const connection = await connectionAPIController.createSAMLConnection({
    tenant,
    product,
    rawMetadata,
    defaultRedirectUrl: `${externalUrl}/api/auth/callback/oidc`,
    redirectUrl: JSON.stringify([
      `${externalUrl}/api/auth/callback/oidc`,
      `${externalUrl}/api/auth/callback/jackson`,
    ]),
  });

  // クレデンシャルは標準出力ではなくファイルに書き出す（CI ログ等への漏洩防止）
  const outputPath =
    process.env.JACKSON_OUTPUT_FILE ?? "/tmp/jackson-connection.txt";
  const output = [
    "=== Connection registered ===",
    `tenant:       ${tenant}`,
    `product:      ${product}`,
    `clientID:     ${connection.clientID}`,
    `clientSecret: ${connection.clientSecret}`,
    "",
    "=== Set these env vars in Infisical (staging) ===",
    `OIDC_ISSUER=${externalUrl}`,
    `OIDC_CLIENT_ID=${connection.clientID}`,
    `OIDC_CLIENT_SECRET=${connection.clientSecret}`,
    "",
    "=== Update Google Workspace custom SAML app ===",
    `ACS URL:    ${externalUrl}/api/saml/acs`,
    `Entity ID:  ${externalUrl}`,
    "",
  ].join("\n");

  // TOCTOU 回避のため open() で権限を指定して作成（writeFile + chmod だと
  // 一瞬 default umask の権限でファイルが存在する瞬間がある）
  const { open } = await import("node:fs/promises");
  const fd = await open(outputPath, "w", 0o600);
  try {
    await fd.writeFile(output, "utf-8");
  } finally {
    await fd.close();
  }

  console.log("\n=== Connection registered ===");
  console.log(`tenant:       ${tenant}`);
  console.log(`product:      ${product}`);
  console.log(`clientID:     ${connection.clientID.slice(0, 8)}...`);
  console.log(`clientSecret: ***（マスク）***`);
  console.log("");
  console.log(`✓ 完全な値は保存先に書き出しました: ${outputPath}`);
  console.log(`  権限 0600 で保存。確認後は手動で削除してください:`);
  console.log(`  rm ${outputPath}`);
  console.log("");
  console.log("Infisical CLI で直接設定する場合:");
  console.log(`  source ${outputPath} の値を Infisical secrets set で投入`);

  process.exit(0);
};

main().catch((err: unknown) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
