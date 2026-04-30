import { execFileSync } from "node:child_process";
import type { Context } from "@/server/api/trpc";
import type { CreateTenantInput } from "./schemas";

/**
 * テナント作成処理
 * 1. DB に Tenant レコード作成（status: PROVISIONING）
 * 2. k8s: helm install でテナント用 internal-manager をデプロイ
 * 3. DB の status を ACTIVE に更新
 * エラー時は status を ERROR に更新してエラーを再スロー
 */
export const createTenant = async (ctx: Context, input: CreateTenantInput) => {
  const domain = `${input.slug}-manager.tumiki.cloud`;

  // DBにテナントレコードを作成（プロビジョニング中）
  const tenant = await ctx.db.tenant.create({
    data: {
      slug: input.slug,
      domain,
      status: "PROVISIONING",
      oidcType: input.oidcType,
    },
  });

  try {
    // TODO: helm チャートは /app/helm/internal-manager にマウントされると想定
    // k8s: helm install でテナント用 internal-manager をデプロイ
    // execFileSync でシェルインジェクションを防止（引数を配列で渡す）
    const helmArgs = [
      "install",
      input.slug,
      "/app/helm/internal-manager",
      "--namespace",
      `tenant-${input.slug}`,
      "--create-namespace",
      "--set",
      `tenant.slug=${input.slug}`,
      "--set",
      `tenant.domain=${domain}`,
      "--set",
      `tenant.oidcType=${input.oidcType}`,
      "--set",
      `image.tag=${input.imageTag}`,
      "--set",
      `infisical.clientId=${input.infisicalClientId}`,
      "--set",
      `infisical.clientSecret=${input.infisicalClientSecret}`,
    ];

    // CUSTOM OIDCの場合は追加パラメーターを設定
    if (input.oidcType === "CUSTOM") {
      if (input.oidcIssuer) {
        helmArgs.push("--set", `oidc.issuer=${input.oidcIssuer}`);
      }
      if (input.oidcClientId) {
        helmArgs.push("--set", `oidc.clientId=${input.oidcClientId}`);
      }
      if (input.oidcClientSecret) {
        helmArgs.push("--set", `oidc.clientSecret=${input.oidcClientSecret}`);
      }
    }

    execFileSync("/usr/local/bin/helm", helmArgs, { stdio: "inherit" });

    // DBのstatusをACTIVEに更新
    const updatedTenant = await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE" },
    });

    return updatedTenant;
  } catch (error) {
    // エラー時はDBのstatusをERRORに更新
    await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ERROR" },
    });

    throw error;
  }
};
