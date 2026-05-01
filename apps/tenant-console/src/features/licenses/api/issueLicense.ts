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

  const privateKey = await getPrivateKey();

  const payload: Record<string, unknown> = {
    iss: "tumiki-license",
    aud: "tumiki-cloud-api",
    sub: input.subject,
    type: input.type,
    features: input.features,
    jti,
  };
  if (input.plan) payload.plan = input.plan;
  if (input.type === "TENANT") payload.tenant = input.tenantId;

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setJti(jti)
    .sign(privateKey);

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
      issuedByEmail: input.issuedByEmail,
    },
  });

  return {
    license,
    token: `${TOKEN_PREFIX}${jwt}`,
  };
};
