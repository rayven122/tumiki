import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createApiKey } from "./createApiKey";
import { listApiKeys } from "./listApiKeys";
import { updateApiKey } from "./updateApiKey";
import { deleteApiKey } from "./deleteApiKey";
import {
  CreateApiKeyInput,
  ListApiKeysInput,
  UpdateApiKeyInput,
  DeleteApiKeyInput,
} from "./schemas";

// 他のファイルから関数をエクスポート
export { validateApiKey } from "./validateApiKey";
export { generateApiKey } from "./generateApiKey";

export const mcpApiKeyRouter = createTRPCRouter({
  // APIキー生成
  create: protectedProcedure.input(CreateApiKeyInput).mutation(createApiKey),

  // APIキー一覧取得
  list: protectedProcedure.input(ListApiKeysInput).query(listApiKeys),

  // APIキー更新
  update: protectedProcedure.input(UpdateApiKeyInput).mutation(updateApiKey),

  // APIキー削除
  delete: protectedProcedure.input(DeleteApiKeyInput).mutation(deleteApiKey),
});
