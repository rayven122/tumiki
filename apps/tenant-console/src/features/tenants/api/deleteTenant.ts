import { execFileSync } from "node:child_process";
import { TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";
import type { DeleteTenantInput } from "./schemas";

/**
 * テナント削除処理
 * 1. DB からテナントを取得
 * 2. ステータスチェック（PROVISIONING/DELETING中は操作不可）
 * 3. helm uninstall でテナントリソースを削除
 * 4. DB からテナントレコードを削除
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
    // execFileSync でシェルインジェクションを防止（引数を配列で渡す）
    execFileSync(
      "/usr/local/bin/helm",
      ["uninstall", tenant.slug, "-n", `tenant-${tenant.slug}`],
      { stdio: "inherit" },
    );
  } catch (error) {
    // helm失敗時はERRORに更新してDBレコードを保持（再試行可能にする）
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
