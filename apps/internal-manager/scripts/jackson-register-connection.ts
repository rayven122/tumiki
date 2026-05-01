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
import { getJackson } from "../src/server/jackson";

const main = async () => {
  const metadataPath = process.argv[2];
  if (!metadataPath) {
    console.error("Usage: tsx scripts/jackson-register-connection.ts <metadata-xml-path>");
    process.exit(1);
  }

  const tenant = process.env.JACKSON_TENANT ?? "default";
  const product = process.env.JACKSON_PRODUCT ?? "tumiki";
  const externalUrl =
    process.env.NEXTAUTH_URL_INTERNAL_MANAGER ?? "http://localhost:3100";

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

  const connection = await connectionAPIController.createSAMLConnection({
    tenant,
    product,
    rawMetadata,
    defaultRedirectUrl: `${externalUrl}/api/auth/callback/oidc`,
    redirectUrl: JSON.stringify([`${externalUrl}/*`]),
  });

  console.log("\n=== Connection registered ===");
  console.log(`tenant:      ${tenant}`);
  console.log(`product:     ${product}`);
  console.log(`clientID:    ${connection.clientID}`);
  console.log(`clientSecret: ${connection.clientSecret}`);
  console.log("\n=== Next: set these env vars in Infisical ===");
  console.log(`OIDC_ISSUER=${externalUrl}`);
  console.log(`OIDC_CLIENT_ID=${connection.clientID}`);
  console.log(`OIDC_CLIENT_SECRET=${connection.clientSecret}`);
  console.log(
    "\nCopy ACS URL / Entity ID into Google Workspace custom SAML app:",
  );
  console.log(`ACS URL:    ${externalUrl}/api/saml/acs`);
  console.log(`Entity ID:  ${externalUrl}`);

  process.exit(0);
};

main().catch((err: unknown) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
