import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";
import {
  HELM_BIN,
  HELM_UPGRADE_TIMEOUT_MS,
  KUBECTL_BIN,
  ROLLOUT_TIMEOUT_MS,
} from "./constants";
import type { UpgradeTenantInput } from "./schemas";

const execFileAsync = promisify(execFile);

// テナントの internal-manager イメージを helm upgrade で更新する
export const upgradeTenant = async (
  ctx: Context,
  input: UpgradeTenantInput,
) => {
  // テナント存在チェック
  const tenant = await ctx.db.tenant.findUnique({
    where: { id: input.id },
  });
  if (!tenant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "テナントが見つかりません",
    });
  }

  // 処理中のステータスは操作不可
  if (
    tenant.status === "PROVISIONING" ||
    tenant.status === "DELETING" ||
    tenant.status === "UPGRADING"
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `ステータスが ${tenant.status} のテナントはアップグレードできません`,
    });
  }

  const namespace = `tenant-${tenant.slug}`;

  // DB status を UPGRADING に更新
  await ctx.db.tenant.update({
    where: { id: tenant.id },
    data: { status: "UPGRADING" },
  });

  try {
    // helm upgrade --reuse-values --atomic でイメージ更新
    await execFileAsync(
      HELM_BIN,
      [
        "upgrade",
        tenant.slug,
        "/app/helm/internal-manager",
        "--namespace",
        namespace,
        "--reuse-values",
        "--atomic",
        "--timeout",
        "1m",
      ],
      { timeout: HELM_UPGRADE_TIMEOUT_MS },
    );

    // Deployment が Ready になるまで待機
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

    // DB status を ACTIVE に更新して返す
    return await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE" },
    });
  } catch (error) {
    console.error("[upgradeTenant] upgrade failed:", error);

    // 失敗時は ERROR に更新
    await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ERROR" },
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "テナントのアップグレードに失敗しました",
      cause: error,
    });
  }
};
