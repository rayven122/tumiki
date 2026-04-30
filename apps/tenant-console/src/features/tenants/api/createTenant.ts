import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";
import type { CreateTenantInput } from "./schemas";

const execFileAsync = promisify(execFile);

const HELM_BIN = "/usr/local/bin/helm";
const KUBECTL_BIN = "/usr/local/bin/kubectl";
/** Helm操作のタイムアウト: Node.js側はHelm側（5分）より30秒長く設定 */
const HELM_TIMEOUT_MS = 5 * 60 * 1000 + 30_000;

/** Helm に渡す非シークレット値の型（シークレットは kubectl Secret で管理） */
type HelmValues = {
  infisical: { projectSlug: string };
  oidc?: { issuer?: string; clientId?: string };
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

      // Helm には非シークレット値のみ渡す
      // OIDC issuer/clientId は URL や任意文字列を含むため --set ではなく JSON ファイル経由で渡す
      // （--set は "," や "=" を特殊文字として扱うためURLが壊れる可能性がある）
      const helmValues: HelmValues = {
        infisical: { projectSlug: input.infisicalProjectSlug },
      };
      if (input.oidcType === "CUSTOM") {
        helmValues.oidc = {
          issuer: input.oidcIssuer,
          clientId: input.oidcClientId,
        };
      }

      const valuesFile = join(tmpDir, "values.json");
      writeFileSync(valuesFile, JSON.stringify(helmValues, null, 2), {
        mode: 0o600,
      });

      // Namespace は kubectl で事前作成済みのため --create-namespace は不要
      // （namespace.yaml テンプレートが Helm でラベルを付与する）
      const helmArgs = [
        "install",
        input.slug,
        "/app/helm/internal-manager",
        "--namespace",
        namespace,
        "--set",
        `tenant.slug=${input.slug}`,
        "--set",
        `tenant.domain=${domain}`,
        "--set",
        `tenant.oidcType=${input.oidcType}`,
        "--set",
        `image.tag=${input.imageTag}`,
        "-f",
        valuesFile,
        "--timeout",
        "5m",
      ];

      await execFileAsync(HELM_BIN, helmArgs, { timeout: HELM_TIMEOUT_MS });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    const updatedTenant = await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE" },
    });

    return updatedTenant;
  } catch (error) {
    await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ERROR" },
    });

    // 内部エラー詳細（kubectl/helmのstderr等）をクライアントに露出しない
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "テナントのプロビジョニングに失敗しました",
      cause: error,
    });
  }
};
