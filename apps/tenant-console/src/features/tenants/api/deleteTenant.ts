import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";
import type { DeleteTenantInput } from "./schemas";

const execFileAsync = promisify(execFile);

const HELM_BIN = "/usr/local/bin/helm";
const KUBECTL_BIN = "/usr/local/bin/kubectl";

/**
 * テナント削除処理
 * 1. DB からテナントを取得
 * 2. ステータスチェック（PROVISIONING/DELETING中は操作不可）
 * 3. helm uninstall でテナントリソースを削除
 * 4. kubectl delete namespace でNamespaceを削除（残存防止）
 * 5. DB からテナントレコードを削除
 */
export const deleteTenant = async (ctx: Context, input: DeleteTenantInput) => {
  // DBからテナントを取得
  const tenant = await ctx.db.tenant.findUniqueOrThrow({
    where: { id: input.id },
  });

  // プロビジョニング中・削除中のテナントは操作不可
  if (tenant.status === "PROVISIONING" || tenant.status === "DELETING") {
    throw new TRPCError({
      code: "CONFLICT",
      message: `ステータスが ${tenant.status} のテナントは削除できません`,
    });
  }

  // DBのstatusをDELETINGに更新
  await ctx.db.tenant.update({
    where: { id: tenant.id },
    data: { status: "DELETING" },
  });

  try {
    const namespace = `tenant-${tenant.slug}`;

    // execFileAsync でシェルインジェクションを防止（引数を配列で渡す）
    await execFileAsync(HELM_BIN, ["uninstall", tenant.slug, "-n", namespace]);

    // helm uninstall 後も Namespace が残存するため kubectl で明示的に削除する
    await execFileAsync(KUBECTL_BIN, [
      "delete",
      "namespace",
      namespace,
      "--ignore-not-found",
    ]);
  } catch (error) {
    // helm/kubectl失敗時はERRORに更新してDBレコードを保持（再試行可能にする）
    await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ERROR" },
    });
    throw error;
  }

  // DBからテナントレコードを削除
  await ctx.db.tenant.delete({
    where: { id: tenant.id },
  });

  return { id: tenant.id };
};
