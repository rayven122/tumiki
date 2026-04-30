import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TRPCError } from "@trpc/server";
import { HELM_BIN, KUBECTL_BIN, HELM_TIMEOUT_MS } from "./constants";
import type { Context } from "@/server/api/trpc";
import type { DeleteTenantInput } from "./schemas";

const execFileAsync = promisify(execFile);

/**
 * テナント削除処理
 * 1. DB からテナントを取得
 * 2. ステータスチェック（PROVISIONING/DELETING中は操作不可）
 * 3. helm uninstall でテナントリソースを削除
 * 4. kubectl delete namespace でNamespaceを削除（残存防止）
 * 5. DB からテナントレコードを削除
 */
export const deleteTenant = async (ctx: Context, input: DeleteTenantInput) => {
  // テナント存在チェック（NOT_FOUND を 500 に変換しない）
  const tenant = await ctx.db.tenant.findUnique({
    where: { id: input.id },
  });
  if (!tenant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "テナントが見つかりません",
    });
  }

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

    await execFileAsync(
      HELM_BIN,
      ["uninstall", tenant.slug, "-n", namespace, "--timeout", "5m"],
      { timeout: HELM_TIMEOUT_MS },
    );

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
    // 内部エラー詳細（kubectl/helmのstderr等）をクライアントに露出しない
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "テナントの削除に失敗しました",
      cause: error,
    });
  }

  // DBからテナントレコードを削除（k8sリソースは既に消えているのでDB側のみ）
  // 失敗時は ERROR に倒して状態不整合（k8s なし / DB DELETING のまま）を防止
  try {
    await ctx.db.tenant.delete({
      where: { id: tenant.id },
    });
  } catch (dbError) {
    await ctx.db.tenant.update({
      where: { id: tenant.id },
      data: { status: "ERROR" },
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "テナントレコードの削除に失敗しました",
      cause: dbError,
    });
  }

  return { id: tenant.id };
};
