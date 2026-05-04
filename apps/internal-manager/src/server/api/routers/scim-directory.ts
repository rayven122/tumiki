import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  getJackson,
  isJacksonConfigured,
  resolveExternalUrl,
} from "~/server/jackson";

// Jackson が対応する Directory プロバイダ種別
// "google" は SCIM ではなく Jackson の Google Workspace OAuth 同期
const directoryTypeSchema = z.enum([
  "azure-scim-v2",
  "okta-scim-v2",
  "onelogin-scim-v2",
  "jumpcloud-scim-v2",
  "generic-scim-v2",
  "google",
]);

type DirectoryType = z.infer<typeof directoryTypeSchema>;

const TENANT = "default";
const PRODUCT = "internal-manager";

// Google Workspace OAuth Client が設定されているか
const isGoogleConfigured = () =>
  !!process.env.GOOGLE_DIRECTORY_CLIENT_ID &&
  !!process.env.GOOGLE_DIRECTORY_CLIENT_SECRET;

const ensureJackson = async () => {
  if (!isJacksonConfigured()) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Jackson が初期化されていません",
    });
  }
  // getJackson() は DB 接続エラー等でスローし得る。tRPC に内部エラーが
  // 漏れないよう SERVICE_UNAVAILABLE に正規化する（route-helpers.ts と対称）
  try {
    return await getJackson();
  } catch (e) {
    console.error("[scim-directory] jackson init failed:", e);
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Jackson の初期化に失敗しました",
    });
  }
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
      // google タイプは SCIM endpoint を持たない（pull 型）
      scimEndpoint: d.type === "google" ? null : buildScimEndpoint(d.scim),
      // google は OAuth 認可済みかどうか
      googleAuthorized:
        d.type === "google" ? !!d.google_refresh_token : undefined,
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
      // google タイプは GOOGLE_DIRECTORY_CLIENT_ID/SECRET が必要
      if (input.type === "google" && !isGoogleConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Google Directory OAuth が未設定です（GOOGLE_DIRECTORY_CLIENT_ID/SECRET）",
        });
      }

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
      // google は SCIM Secret なし（OAuth フローへ遷移する用の URL を返す）
      if (data.type === "google") {
        return {
          id: data.id,
          name: data.name,
          type: data.type as DirectoryType,
          scimEndpoint: null,
          scimSecret: null,
          googleAuthorizationUrl: data.google_authorization_url ?? null,
        };
      }
      // 平文の SCIM Secret はこのレスポンスでのみ返却
      return {
        id: data.id,
        name: data.name,
        type: data.type as DirectoryType,
        scimEndpoint: buildScimEndpoint(data.scim),
        scimSecret: data.scim.secret,
        googleAuthorizationUrl: null,
      };
    }),

  /** Google Workspace OAuth 認可URLを再取得（再認可時など） */
  getGoogleAuthorizationUrl: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (!isGoogleConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Directory OAuth が未設定です",
        });
      }
      const jackson = await ensureJackson();
      const { data, error } =
        await jackson.directorySyncController.google.generateAuthorizationUrl({
          directoryId: input.id,
        });
      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "認可URLの生成に失敗しました",
        });
      }
      return { authorizationUrl: data.authorizationUrl };
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
