import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  getJackson,
  isJacksonConfigured,
  resolveExternalUrl,
} from "~/server/jackson";

// Jackson が対応する SCIM プロバイダ種別
const directoryTypeSchema = z.enum([
  "azure-scim-v2",
  "okta-scim-v2",
  "onelogin-scim-v2",
  "jumpcloud-scim-v2",
  "generic-scim-v2",
]);

const TENANT = "default";
const PRODUCT = "internal-manager";

const ensureJackson = async () => {
  if (!isJacksonConfigured()) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Jackson が初期化されていません",
    });
  }
  return getJackson();
};

// Jackson の Directory.scim.endpoint が未設定の場合に備えて、外部URL+pathで
// 完全なエンドポイントURLを組み立てる。フォールバックを path のみにすると
// 管理者がIdPに不完全URLを設定してしまうリスクがある。
const buildScimEndpoint = (scim: { endpoint?: string; path: string }) =>
  scim.endpoint ?? `${resolveExternalUrl()}${scim.path}`;

export const scimDirectoryRouter = createTRPCRouter({
  /** SCIM Directory 一覧を取得 */
  list: adminProcedure.query(async () => {
    const jackson = await ensureJackson();
    const { data, error } =
      await jackson.directorySyncController.directories.getByTenantAndProduct(
        TENANT,
        PRODUCT,
      );
    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }
    return (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      deactivated: d.deactivated ?? false,
      scimEndpoint: buildScimEndpoint(d.scim),
    }));
  }),

  /** SCIM Directory を作成し、初回のみ Bearer Secret を返却 */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: directoryTypeSchema.default("generic-scim-v2"),
      }),
    )
    .mutation(async ({ input }) => {
      const jackson = await ensureJackson();
      const { data, error } =
        await jackson.directorySyncController.directories.create({
          name: input.name,
          tenant: TENANT,
          product: PRODUCT,
          type: input.type,
        });
      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Directory の作成に失敗しました",
        });
      }
      // 平文の SCIM Secret はこのレスポンスでのみ返却
      return {
        id: data.id,
        name: data.name,
        scimEndpoint: buildScimEndpoint(data.scim),
        scimSecret: data.scim.secret,
      };
    }),

  /** SCIM Directory を削除 */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const jackson = await ensureJackson();
      const { error } =
        await jackson.directorySyncController.directories.delete(input.id);
      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
      return { ok: true };
    }),
});
