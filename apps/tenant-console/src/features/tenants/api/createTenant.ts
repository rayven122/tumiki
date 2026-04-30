import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

    // シークレット値を一時JSONファイル経由で渡す（ps aux / helm get values での平文漏洩を防止）
    const tmpDir = mkdtempSync(join(tmpdir(), "helm-values-"));
    const valuesFile = join(tmpDir, "secret-values.json");

    try {
      // HelmはJSON valuesファイルをサポートしているため、JSON.stringifyで安全にシリアライズ
      type OidcSecretValues = { clientSecret: string };
      type SecretValues = {
        infisical: {
          clientId: string;
          clientSecret: string;
          projectSlug: string;
        };
        oidc?: OidcSecretValues;
      };

      const secretValues: SecretValues = {
        infisical: {
          clientId: input.infisicalClientId,
          clientSecret: input.infisicalClientSecret,
          projectSlug: input.infisicalProjectSlug,
        },
      };

      if (input.oidcType === "CUSTOM" && input.oidcClientSecret) {
        secretValues.oidc = { clientSecret: input.oidcClientSecret };
      }

      // パーミッション0o600でオーナーのみ読み取り可能にする
      writeFileSync(valuesFile, JSON.stringify(secretValues, null, 2), {
        mode: 0o600,
      });

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
        // シークレット値はJSONファイル経由で渡す（--set では渡さない）
        "-f",
        valuesFile,
      ];

      // CUSTOM OIDCの場合は非シークレットのパラメーターを追加
      if (input.oidcType === "CUSTOM") {
        if (input.oidcIssuer) {
          helmArgs.push("--set", `oidc.issuer=${input.oidcIssuer}`);
        }
        if (input.oidcClientId) {
          helmArgs.push("--set", `oidc.clientId=${input.oidcClientId}`);
        }
      }

      execFileSync("/usr/local/bin/helm", helmArgs, { stdio: "inherit" });
    } finally {
      // 使用後は一時ディレクトリを確実に削除する
      rmSync(tmpDir, { recursive: true, force: true });
    }

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
