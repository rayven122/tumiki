import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Context } from "@/server/api/trpc";
import type { CreateTenantInput } from "./schemas";

const execFileAsync = promisify(execFile);

const HELM_BIN = "/usr/local/bin/helm";
const KUBECTL_BIN = "/usr/local/bin/kubectl";

/** OIDC シークレット値の型 */
type OidcSecretValues = { clientSecret: string };

/** Helm に渡す非シークレット値の型 */
type HelmValues = {
  infisical: { projectSlug: string };
  oidc?: OidcSecretValues;
};

/**
 * テナント作成処理
 * 1. DB に Tenant レコード作成（status: PROVISIONING）
 * 2. k8s Secret を kubectl で事前作成（Helmリリース値への保存を防ぐ）
 * 3. k8s: helm install でテナント用 internal-manager をデプロイ
 * 4. DB の status を ACTIVE に更新
 * エラー時は status を ERROR に更新してエラーを再スロー
 */
export const createTenant = async (ctx: Context, input: CreateTenantInput) => {
  const domain = `${input.slug}-manager.tumiki.cloud`;
  const namespace = `tenant-${input.slug}`;

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
    const tmpDir = mkdtempSync(join(tmpdir(), "helm-values-"));

    try {
      // Namespace を事前作成（helm install より前に Secret を作る必要があるため）
      // AlreadyExists エラーは無視する
      try {
        await execFileAsync(KUBECTL_BIN, ["create", "namespace", namespace]);
      } catch (nsError) {
        // 既に存在する場合のエラーは無視する
        if (
          !(nsError instanceof Error) ||
          !nsError.message.includes("AlreadyExists")
        ) {
          throw nsError;
        }
      }

      // Infisical 認証情報を k8s Secret として作成
      // Helmリリース値（helm get values）に保存されるのを防ぐため kubectl で直接作成する
      const infisicalSecretManifest = [
        `apiVersion: v1`,
        `kind: Secret`,
        `metadata:`,
        `  name: infisical-machine-identity`,
        `  namespace: ${namespace}`,
        `type: Opaque`,
        `stringData:`,
        `  clientId: ${JSON.stringify(input.infisicalClientId)}`,
        `  clientSecret: ${JSON.stringify(input.infisicalClientSecret)}`,
      ].join("\n");

      const infisicalSecretFile = join(tmpDir, "infisical-secret.yaml");
      // パーミッション0o600でオーナーのみ読み取り可能にする
      writeFileSync(infisicalSecretFile, infisicalSecretManifest, {
        mode: 0o600,
      });
      await execFileAsync(KUBECTL_BIN, ["apply", "-f", infisicalSecretFile]);

      // CUSTOM OIDC の場合は oidc-credentials Secret を事前作成
      if (input.oidcType === "CUSTOM" && input.oidcClientSecret) {
        const oidcSecretManifest = [
          `apiVersion: v1`,
          `kind: Secret`,
          `metadata:`,
          `  name: oidc-credentials`,
          `  namespace: ${namespace}`,
          `type: Opaque`,
          `stringData:`,
          `  clientSecret: ${JSON.stringify(input.oidcClientSecret)}`,
        ].join("\n");

        const oidcSecretFile = join(tmpDir, "oidc-secret.yaml");
        writeFileSync(oidcSecretFile, oidcSecretManifest, { mode: 0o600 });
        await execFileAsync(KUBECTL_BIN, ["apply", "-f", oidcSecretFile]);
      }

      // Helm には非シークレット値のみ渡す（projectSlug はシークレットではないので安全）
      const helmValues: HelmValues = {
        infisical: { projectSlug: input.infisicalProjectSlug },
      };

      const valuesFile = join(tmpDir, "values.json");
      // パーミッション0o600でオーナーのみ読み取り可能にする
      writeFileSync(valuesFile, JSON.stringify(helmValues, null, 2), {
        mode: 0o600,
      });

      const helmArgs = [
        "install",
        input.slug,
        "/app/helm/internal-manager",
        "--namespace",
        namespace,
        // Namespace は kubectl で事前作成済みのため --create-namespace は不要だが念のため指定
        "--create-namespace",
        "--set",
        `tenant.slug=${input.slug}`,
        "--set",
        `tenant.domain=${domain}`,
        "--set",
        `tenant.oidcType=${input.oidcType}`,
        "--set",
        `image.tag=${input.imageTag}`,
        // 非シークレット値はJSONファイル経由で渡す（--set では渡さない）
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

      await execFileAsync(HELM_BIN, helmArgs);
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
