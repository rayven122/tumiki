import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";
import { validateScimAuth, SCIM_PROVIDER } from "~/lib/scim/auth";
import {
  formatUser,
  listResponse,
  scimError,
  scimResponse,
} from "~/lib/scim/formatters";
import { scimUserSchema } from "~/lib/scim/schemas";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  externalIdentities: { select: { provider: true, sub: true } },
} as const;

/** フィルタ文字列 "fieldName eq \"value\"" をパース */
const parseEqFilter = (
  filter: string,
): { field: string; value: string } | null => {
  const match = /^(\w+)\s+eq\s+"([^"]+)"$/i.exec(filter.trim());
  if (!match?.[1] || !match[2]) return null;
  return { field: match[1].toLowerCase(), value: match[2] };
};

/** ユーザー一覧 */
export const GET = async (req: NextRequest) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { searchParams } = req.nextUrl;
  const filter = searchParams.get("filter");
  const startIndex = Math.max(1, Number(searchParams.get("startIndex") ?? 1));
  const count = Math.min(
    100,
    Math.max(1, Number(searchParams.get("count") ?? 100)),
  );

  let emailFilter: string | undefined;
  if (filter) {
    const parsed = parseEqFilter(filter);
    if (parsed?.field === "username") emailFilter = parsed.value;
  }

  const where = emailFilter ? { email: emailFilter } : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: USER_SELECT,
      skip: startIndex - 1,
      take: count,
      orderBy: { createdAt: "asc" },
    }),
    db.user.count({ where }),
  ]);

  const origin = req.nextUrl.origin;
  const resources = users.map((u) => formatUser(u, origin));

  return scimResponse(listResponse(resources, total, startIndex));
};

/** ユーザー作成 */
export const POST = async (req: NextRequest) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = scimUserSchema.safeParse(rawBody);
  if (!parsed.success) {
    return scimError(400, parsed.error.message, "invalidValue");
  }

  const input = parsed.data;

  // メールアドレス解決: emailsフィールド → userName の順で取得
  const email =
    input.emails?.find((e) => e.primary)?.value ??
    input.emails?.[0]?.value ??
    (input.userName.includes("@") ? input.userName : undefined);

  // 表示名解決: displayName → name.formatted → givenName + familyName の順
  const nameParts = [input.name?.givenName, input.name?.familyName].filter(
    Boolean,
  );
  const displayName =
    input.displayName ??
    input.name?.formatted ??
    (nameParts.length > 0 ? nameParts.join(" ") : undefined);

  // メールアドレス重複チェック
  if (email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return scimError(
        409,
        `User with email ${email} already exists`,
        "uniqueness",
      );
    }
  }

  const userId = crypto.randomUUID();

  const user = await db.user.create({
    data: {
      id: userId,
      email: email ?? null,
      name: displayName ?? null,
      isActive: input.active,
      ...(input.externalId
        ? {
            externalIdentities: {
              create: { provider: SCIM_PROVIDER, sub: input.externalId },
            },
          }
        : {}),
    },
    select: USER_SELECT,
  });

  return scimResponse(formatUser(user, req.nextUrl.origin), 201);
};
