#!/usr/bin/env tsx
/**
 * saml-jackson に SAML/OIDC Connection を登録するスクリプト
 *
 * 使い方:
 *   pnpm tsx scripts/jackson-register-connection.ts <metadata-xml-path>
 *
 * 環境変数:
 *   - INTERNAL_DATABASE_URL: jackson が使う PostgreSQL
 *   - TUMIKI_INTERNAL_MANAGER_SECRET_KEY: Auth.js / Jackson 暗号化キーの導出元
 *   - TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY: OIDC ID Token 署名用 private key
 *   - TUMIKI_INTERNAL_MANAGER_PUBLIC_URL: アプリの公開 URL（saml-jackson の externalUrl）
 *   - JACKSON_TENANT: テナント識別子（デフォルト "default"）
 *   - JACKSON_WEB_PRODUCT: Web 用プロダクト識別子（デフォルト JACKSON_PRODUCT or "tumiki"）
 *   - JACKSON_DESKTOP_PRODUCT: Desktop 用プロダクト識別子（デフォルト "<web-product>-desktop"）
 *   - JACKSON_DESKTOP_REDIRECT_URL: Desktop 用 redirect_uri（デフォルト "tumiki://auth/callback"）
 *
 * 出力:
 *   登録結果の確認用に client 情報を 0600 のファイルへ書き出す。
 *   通常運用ではこのスクリプトを使わず、TUMIKI_INTERNAL_MANAGER_SAML_* /
 *   TUMIKI_INTERNAL_MANAGER_OIDC_* からアプリが自動生成した connection を使う。
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getJackson, resolveExternalUrl } from "../src/server/jackson";
import { DEFAULT_DESKTOP_REDIRECT_URL } from "../src/server/jackson/oidc-clients";

const main = async () => {
  const metadataPath = process.argv[2];
  if (!metadataPath) {
    console.error(
      "Usage: tsx scripts/jackson-register-connection.ts <metadata-xml-path>",
    );
    process.exit(1);
  }

  const tenant = process.env.JACKSON_TENANT ?? "default";
  const webProduct =
    process.env.JACKSON_WEB_PRODUCT ?? process.env.JACKSON_PRODUCT ?? "tumiki";
  const desktopProduct =
    process.env.JACKSON_DESKTOP_PRODUCT ?? `${webProduct}-desktop`;
  const desktopRedirectUrl =
    process.env.JACKSON_DESKTOP_REDIRECT_URL ?? DEFAULT_DESKTOP_REDIRECT_URL;
  // モジュールと同じ解決ロジックを使用（不一致防止）
  const externalUrl = resolveExternalUrl();
  const webRedirectUrl = `${externalUrl}/api/auth/callback/oidc`;

  const rawMetadata = await readFile(resolve(metadataPath), "utf-8");

  const { connectionAPIController } = await getJackson();

  const createConnection = async ({
    product,
    redirectUrl,
  }: {
    product: string;
    redirectUrl: string;
  }) => {
    const existing = await connectionAPIController.getConnections({
      tenant,
      product,
    });

    if (existing.length > 0) {
      console.log(
        `[INFO] Existing connection found for ${tenant}/${product}, will be updated`,
      );
    }

    return connectionAPIController.createSAMLConnection({
      tenant,
      product,
      rawMetadata,
      defaultRedirectUrl: redirectUrl,
      redirectUrl: JSON.stringify([redirectUrl]),
    });
  };

  // 同じ SAML IdP metadata を使い、OIDC client は Web confidential と Desktop public で分ける。
  const webConnection = await createConnection({
    product: webProduct,
    redirectUrl: webRedirectUrl,
  });
  const desktopConnection = await createConnection({
    product: desktopProduct,
    redirectUrl: desktopRedirectUrl,
  });

  // クレデンシャルは標準出力ではなくファイルに書き出す（CI ログ等への漏洩防止）
  const outputPath =
    process.env.JACKSON_OUTPUT_FILE ?? "/tmp/jackson-connection.txt";
  const output = [
    "=== Web connection registered ===",
    `tenant:       ${tenant}`,
    `product:      ${webProduct}`,
    `redirectUrl:  ${webRedirectUrl}`,
    `clientID:     ${webConnection.clientID}`,
    `clientSecret: ${webConnection.clientSecret}`,
    "",
    "=== Desktop connection registered ===",
    `tenant:       ${tenant}`,
    `product:      ${desktopProduct}`,
    `redirectUrl:  ${desktopRedirectUrl}`,
    `clientID:     ${desktopConnection.clientID}`,
    `clientSecret: ${desktopConnection.clientSecret}`,
    "",
    "=== Auto-provisioned OIDC values (debug only; do not copy to env in normal operation) ===",
    `OIDC_ISSUER=${externalUrl}`,
    `OIDC_CLIENT_ID=${webConnection.clientID}`,
    `OIDC_CLIENT_SECRET=${webConnection.clientSecret}`,
    `OIDC_DESKTOP_CLIENT_ID=${desktopConnection.clientID}`,
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
  console.log(
    `web:          ${webProduct} / ${webConnection.clientID.slice(0, 8)}...`,
  );
  console.log(
    `desktop:      ${desktopProduct} / ${desktopConnection.clientID.slice(0, 8)}...`,
  );
  console.log(`clientSecret: ***（マスク）***`);
  console.log("");
  console.log(`✓ 完全な値は保存先に書き出しました: ${outputPath}`);
  console.log(`  権限 0600 で保存。確認後は手動で削除してください:`);
  console.log(`  rm ${outputPath}`);
  console.log("");
  console.log("通常運用ではこの値を Infisical に転記せず、");
  console.log(
    "TUMIKI_INTERNAL_MANAGER_SAML_* / TUMIKI_INTERNAL_MANAGER_OIDC_* を使います。",
  );

  process.exit(0);
};

main().catch((err: unknown) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
