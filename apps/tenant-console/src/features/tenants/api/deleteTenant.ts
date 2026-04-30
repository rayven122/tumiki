import { execFileSync } from "node:child_process";
import type { Context } from "@/server/api/trpc";
import type { DeleteTenantInput } from "./schemas";

/**
 * テナント削除処理
 * 1. DB からテナントを取得
 * 2. helm uninstall でテナントリソースを削除
 * 3. DB からテナントレコードを削除
 */
export const deleteTenant = async (ctx: Context, input: DeleteTenantInput) => {
  // DBからテナントを取得
  const tenant = await ctx.db.tenant.findUniqueOrThrow({
    where: { id: input.id },
  });

  // DBのstatusをDELETINGに更新
  await ctx.db.tenant.update({
    where: { id: tenant.id },
    data: { status: "DELETING" },
  });

  try {
    // TODO: helm uninstall でテナントリソースを削除
    // execFileSync でシェルインジェクションを防止（引数を配列で渡す）
    execFileSync(
      "/usr/local/bin/helm",
      ["uninstall", tenant.slug, "-n", `tenant-${tenant.slug}`],
      { stdio: "inherit" },
    );
  } catch (error) {
    // helm uninstall が失敗した場合はエラーログを出力するが、
    // DBからは削除を続行（リソースが既に存在しない可能性もある）
    console.error(
      `[tenant-console] helm uninstall failed for tenant ${tenant.slug}:`,
      error,
    );
  }

  // DBからテナントレコードを削除
  await ctx.db.tenant.delete({
    where: { id: tenant.id },
  });

  return { id: tenant.id };
};
