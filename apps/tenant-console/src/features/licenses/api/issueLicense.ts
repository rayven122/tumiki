import { SignJWT, importPKCS8 } from "jose";
import { TRPCError } from "@trpc/server";
import { type Context } from "@/server/api/trpc";
import { env } from "@/lib/env";
import { type IssueLicenseInput } from "./schemas";

const TOKEN_PREFIX = "tumiki_lic_";

/** 起動後に一度だけ秘密鍵を parse してプロセス内キャッシュ */
let cachedPrivateKey: CryptoKey | null = null;

const getPrivateKey = async (): Promise<CryptoKey> => {
  if (cachedPrivateKey) return cachedPrivateKey;
  cachedPrivateKey = await importPKCS8(
    env.LICENSE_SIGNING_PRIVATE_KEY,
    "RS256",
  );
  return cachedPrivateKey;
};

export const issueLicense = async (ctx: Context, input: IssueLicenseInput) => {
  if (input.type === "TENANT") {
    const tenant = await ctx.db.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `テナント ID: ${input.tenantId} が見つかりません`,
      });
    }
  }

  const jti = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.ttlDays * 86400 * 1000);

  // DB保存を JWT 署名より先に行う。
  // 逆順だと JWT 発行後に DB 保存が失敗した場合、revocation list にない有効トークンが流通するリスクがある。
  const license = await ctx.db.license.create({
    data: {
      type: input.type,
      subject: input.subject,
      tenantId: input.type === "TENANT" ? input.tenantId : undefined,
      features: input.features,
      plan: input.plan,
      jti,
      issuedAt: now,
      expiresAt,
      notes: input.notes,
      // TODO: 認証実装時はコンテキストから自動取得し、クライアント入力に依存しない形にする
      issuedByEmail: input.issuedByEmail,
    },
  });

  const privateKey = await getPrivateKey();

  const payload: Record<string, unknown> = {
    iss: "tumiki-license",
    aud: "tumiki-cloud-api",
    sub: input.subject,
    type: input.type,
    features: input.features,
  };
  if (input.plan) payload.plan = input.plan;
  if (input.type === "TENANT") payload.tenant = input.tenantId;

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setJti(jti)
    .sign(privateKey);

  return {
    license,
    token: `${TOKEN_PREFIX}${jwt}`,
  };
};
