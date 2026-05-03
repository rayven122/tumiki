import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@db-client";
import { env } from "@/lib/env";
import type { Context } from "@/server/api/trpc";
import {
  addIdentityToProject,
  createProject,
  deleteProject,
  ensureFolder,
  upsertSecrets,
} from "@/server/infisical/client";
import { createTenantRealm, deleteTenantRealm } from "@/server/keycloak/client";
import {
  HELM_BIN,
  HELM_INSTALL_TIMEOUT_MS,
  KUBECTL_BIN,
  ROLLOUT_TIMEOUT_MS,
} from "./constants";
import type { CreateTenantInput } from "./schemas";

const execFileAsync = promisify(execFile);

type HelmValues = {
  infisical: { hostAPI: string; projectSlug: string; environment: string };
  oidc?: { issuer?: string; clientId?: string };
};

const generateHexSecret = (): string => randomBytes(32).toString("hex");

/**
 * テナント自動プロビジョニング処理（Phase 1）。
 *
 *  1. DB レコード作成 (PROVISIONING)
 *  2. シークレット自動生成 (POSTGRES_PASSWORD / AUTH_SECRET)
 *  3. Infisical プロジェクト作成 + シークレット登録 + Operator Identity 紐付け
 *  4. k8s Namespace + RoleBinding + infisical-machine-identity Secret 作成
 *  5. helm install で internal-manager デプロイ
 *  6. DB の status を ACTIVE に更新
 *
 *  失敗時は Infisical プロジェクト削除 + k8s リソースクリーンアップ + DB ステータス ERROR に倒す。
 */
export const createTenant = async (ctx: Context, input: CreateTenantInput) => {
  const domain = `${input.slug}-manager.tumiki.cloud`;
  const namespace = `tenant-${input.slug}`;
  const infisicalProjectName = `tumiki-tenant-${input.slug}`;
  const infisicalProjectSlug = infisicalProjectName;

  let tenant;
  try {
    tenant = await ctx.db.tenant.create({
      data: {
        slug: input.slug,
        domain,
        status: "PROVISIONING",
        oidcType: input.oidcType,
      },
    });
  } catch (dbError) {
    if (
      dbError instanceof Prisma.PrismaClientKnownRequestError &&
      dbError.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `スラッグ "${input.slug}" は既に使用されています`,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "テナント情報の DB 登録に失敗しました",
      cause: dbError,
    });
  }

  let createdProjectId: string | null = null;
  let keycloakRealmCreated = false;

  try {
    const postgresPassword = generateHexSecret();
    const authSecret = generateHexSecret();
    const internalDatabaseUrl = `postgresql://app:${postgresPassword}@postgresql.${namespace}.svc.cluster.local:5432/internal_manager`;
    const nextAuthUrl = `https://${domain}`;

    const project = await createProject({
      projectName: infisicalProjectName,
      slug: infisicalProjectSlug,
    });
    createdProjectId = project.projectId;

    await addIdentityToProject({
      projectId: project.projectId,
      identityId: env.INFISICAL_OPERATOR_IDENTITY_ID,
      role: "developer",
    });

    const secrets: Record<string, string> = {
      POSTGRES_PASSWORD: postgresPassword,
      AUTH_SECRET: authSecret,
      INTERNAL_DATABASE_URL: internalDatabaseUrl,
      NEXTAUTH_URL: nextAuthUrl,
    };
    if (input.oidcType === "KEYCLOAK") {
      const { clientSecret } = await createTenantRealm({
        slug: input.slug,
        domain,
      });
      keycloakRealmCreated = true;
      secrets.OIDC_ISSUER = `https://auth.tumiki.cloud/realms/${input.slug}`;
      secrets.OIDC_CLIENT_ID = "internal-manager";
      secrets.OIDC_CLIENT_SECRET = clientSecret;
      secrets.OIDC_DESKTOP_CLIENT_ID = "internal-manager-desktop";
    } else if (input.oidcType === "CUSTOM") {
      if (input.oidcIssuer) secrets.OIDC_ISSUER = input.oidcIssuer;
      if (input.oidcClientId) secrets.OIDC_CLIENT_ID = input.oidcClientId;
      if (input.oidcClientSecret)
        secrets.OIDC_CLIENT_SECRET = input.oidcClientSecret;
      if (input.oidcDesktopClientId)
        secrets.OIDC_DESKTOP_CLIENT_ID = input.oidcDesktopClientId;
    }
    await ensureFolder({
      projectId: project.projectId,
      environment: "prod",
      folderPath: "/internal-manager",
    });
    await upsertSecrets({
      projectId: project.projectId,
      environment: "prod",
      secretsPath: "/internal-manager",
      secrets,
    });

    const tmpDir = mkdtempSync(join(tmpdir(), "helm-values-"));

    try {
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
      // Helm が既存 Namespace を採用できるよう管理ラベル/アノテーションを付与する
      // （kubectl create namespace で作成した Namespace は Helm ラベルを持たないため必須）
      await execFileAsync(KUBECTL_BIN, [
        "label",
        "namespace",
        namespace,
        "app.kubernetes.io/managed-by=Helm",
        "--overwrite",
      ]);
      await execFileAsync(KUBECTL_BIN, [
        "annotate",
        "namespace",
        namespace,
        `meta.helm.sh/release-name=${input.slug}`,
        `meta.helm.sh/release-namespace=${namespace}`,
        "--overwrite",
      ]);

      await execFileAsync(KUBECTL_BIN, [
        "create",
        "rolebinding",
        "tenant-console-operator",
        "--namespace",
        namespace,
        "--clusterrole=tenant-console-tenant-operator",
        "--serviceaccount=tenant-console:tenant-console",
      ]).catch((err: unknown) => {
        if (!(err instanceof Error) || !err.message.includes("AlreadyExists")) {
          throw err;
        }
      });

      const infisicalSecretManifest = [
        `apiVersion: v1`,
        `kind: Secret`,
        `metadata:`,
        `  name: infisical-machine-identity`,
        `  namespace: ${namespace}`,
        `type: Opaque`,
        `data:`,
        `  clientId: ${Buffer.from(env.INFISICAL_OPERATOR_CLIENT_ID).toString("base64")}`,
        `  clientSecret: ${Buffer.from(env.INFISICAL_OPERATOR_CLIENT_SECRET).toString("base64")}`,
      ].join("\n");

      const infisicalSecretFile = join(tmpDir, "infisical-secret.yaml");
      writeFileSync(infisicalSecretFile, infisicalSecretManifest, {
        mode: 0o600,
      });
      await execFileAsync(KUBECTL_BIN, ["apply", "-f", infisicalSecretFile]);

      const helmValues: HelmValues = {
        infisical: {
          hostAPI: env.INFISICAL_API_URL,
          projectSlug: infisicalProjectSlug,
          environment: "prod",
        },
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
        // --wait を使わず Pod 起動待ちは kubectl rollout status で行う
      ];
      await execFileAsync(HELM_BIN, helmArgs, {
        timeout: HELM_INSTALL_TIMEOUT_MS,
      });

      // Deployment が Ready になるまで待機（InitContainer の DB マイグレーション完了を含む）
      await execFileAsync(
        KUBECTL_BIN,
        [
          "rollout",
          "status",
          "deployment/internal-manager",
          "-n",
          namespace,
          "--timeout=10m",
        ],
        { timeout: ROLLOUT_TIMEOUT_MS },
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    return await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE" },
    });
  } catch (error) {
    console.error("[createTenant] provisioning failed:", error);
    const ignore = (_: unknown) => undefined;
    await execFileAsync(HELM_BIN, [
      "uninstall",
      input.slug,
      "-n",
      namespace,
    ]).catch(ignore);
    await execFileAsync(KUBECTL_BIN, [
      "delete",
      "namespace",
      namespace,
      "--ignore-not-found",
    ]).catch(ignore);
    if (createdProjectId) {
      await deleteProject(createdProjectId).catch(ignore);
    }
    if (keycloakRealmCreated) {
      await deleteTenantRealm(input.slug).catch(ignore);
    }

    await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ERROR" },
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "テナントのプロビジョニングに失敗しました",
      cause: error,
    });
  }
};
