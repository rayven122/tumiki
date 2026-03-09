import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  CreateMcpServerTemplateInput,
  CreateMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート作成実装（CE版）
 *
 * CE版では利用不可（EE機能）
 */
export const createMcpServerTemplate = async ({
  input: _input,
  ctx: _ctx,
}: {
  input: CreateMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<CreateMcpServerTemplateOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "この機能はEnterpriseエディションでのみ利用可能です",
  });
};
