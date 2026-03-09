import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  UpdateMcpServerTemplateInput,
  UpdateMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート更新実装（CE版）
 *
 * CE版では利用不可（EE機能）
 */
export const updateMcpServerTemplate = async ({
  input: _input,
  ctx: _ctx,
}: {
  input: UpdateMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<UpdateMcpServerTemplateOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "この機能はEnterpriseエディションでのみ利用可能です",
  });
};
