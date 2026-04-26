import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";
import { SCIM_PROVIDER, validateScimAuth } from "~/lib/scim/auth";
import { formatUser, scimError, scimResponse } from "~/lib/scim/formatters";
import { scimPatchOpSchema } from "~/lib/scim/schemas";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  externalIdentities: { select: { provider: true, sub: true } },
} as const;

type RouteContext = { params: Promise<{ id: string }> };

/** ユーザー取得 */
export const GET = async (req: NextRequest, { params }: RouteContext) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return scimError(404, "User not found");

  return scimResponse(formatUser(user, req.nextUrl.origin));
};

/** ユーザー更新（active状態変更・属性更新） */
export const PATCH = async (req: NextRequest, { params }: RouteContext) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return scimError(404, "User not found");

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = scimPatchOpSchema.safeParse(rawBody);
  if (!parsed.success) {
    return scimError(400, parsed.error.message, "invalidValue");
  }

  const updates: {
    name?: string | null;
    email?: string | null;
    isActive?: boolean;
  } = {};

  for (const op of parsed.data.Operations) {
    const path = op.path?.toLowerCase();

    if (op.op === "replace") {
      if (path === "active" && typeof op.value === "boolean") {
        updates.isActive = op.value;
      } else if (path === "displayname" && typeof op.value === "string") {
        updates.name = op.value;
      } else if (
        !path &&
        typeof op.value === "object" &&
        op.value !== null &&
        !Array.isArray(op.value)
      ) {
        // pathなしのreplace: オブジェクト全体更新（Okta形式）
        const val = op.value;
        if (typeof val.active === "boolean") updates.isActive = val.active;
        if (typeof val.displayName === "string") updates.name = val.displayName;
      }
    }

    if (
      op.op === "add" &&
      path === "externalid" &&
      typeof op.value === "string"
    ) {
      // externalId追加: ExternalIdentityをupsert
      await db.externalIdentity.upsert({
        where: { provider_sub: { provider: SCIM_PROVIDER, sub: op.value } },
        create: { userId: id, provider: SCIM_PROVIDER, sub: op.value },
        update: {},
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    const user = await db.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    return scimResponse(formatUser(user!, req.nextUrl.origin));
  }

  const user = await db.user.update({
    where: { id },
    data: updates,
    select: USER_SELECT,
  });

  return scimResponse(formatUser(user, req.nextUrl.origin));
};

/** ユーザー削除（ソフト削除: isActive=false） */
export const DELETE = async (req: NextRequest, { params }: RouteContext) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return scimError(404, "User not found");

  await db.user.update({ where: { id }, data: { isActive: false } });

  return new Response(null, { status: 204 });
};
