import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  DeleteMcpServerTemplateInput,
  DeleteMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート削除実装（CE版）
 *
 * CE版では利用不可（EE機能）
 */
export const deleteMcpServerTemplate = async ({
  input: _input,
  ctx: _ctx,
}: {
  input: DeleteMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<DeleteMcpServerTemplateOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "この機能はEnterpriseエディションでのみ利用可能です",
  });
};
