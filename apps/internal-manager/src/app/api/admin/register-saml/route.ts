import { NextResponse, type NextRequest } from "next/server";
import { getJackson, resolveExternalUrl } from "@/server/jackson";

/**
 * SAML Connection 管理 API（使用後に削除すること）
 *
 * Authorization: Bearer <ADMIN_REGISTER_SECRET> で認証。
 * GET: tenant/product の全接続を一覧
 * POST: SAML 接続を登録
 * DELETE: tenant/product の全接続を削除
 */

const authorize = (req: NextRequest, secret: string | undefined): boolean => {
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
};

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const secret = process.env.ADMIN_REGISTER_SECRET;
  if (!authorize(req, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant") ?? "default";
  const product = searchParams.get("product") ?? "tumiki";

  try {
    const { connectionAPIController } = await getJackson();
    const connections = await connectionAPIController.getConnections({
      tenant,
      product,
    });
    return NextResponse.json({ connections });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  const secret = process.env.ADMIN_REGISTER_SECRET;
  if (!authorize(req, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const tenant = typeof body.tenant === "string" ? body.tenant : "default";
  const product = typeof body.product === "string" ? body.product : "tumiki";
  const clientID = typeof body.clientID === "string" ? body.clientID : undefined;

  try {
    const { connectionAPIController } = await getJackson();
    await connectionAPIController.deleteConnections({ tenant, product, clientID });
    return NextResponse.json({ deleted: true, tenant, product, clientID });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const secret = process.env.ADMIN_REGISTER_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorize(req, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const rawMetadata = body.rawMetadata;
  if (typeof rawMetadata !== "string" || !rawMetadata) {
    return NextResponse.json(
      { error: "rawMetadata required" },
      { status: 400 },
    );
  }

  const tenant = typeof body.tenant === "string" ? body.tenant : "default";
  const product = typeof body.product === "string" ? body.product : "tumiki";
  const externalUrl = resolveExternalUrl();

  // 追加の redirectUrl を受け取る（省略時は内部デフォルト）
  const extraRedirectUrls =
    Array.isArray(body.extraRedirectUrls) &&
    body.extraRedirectUrls.every((u) => typeof u === "string")
      ? body.extraRedirectUrls
      : [];

  const redirectUrls = [
    `${externalUrl}/api/auth/callback/oidc`,
    `${externalUrl}/api/auth/callback/jackson`,
    ...extraRedirectUrls,
  ];

  try {
    const { connectionAPIController } = await getJackson();

    const connection = await connectionAPIController.createSAMLConnection({
      tenant,
      product,
      rawMetadata,
      defaultRedirectUrl: `${externalUrl}/api/auth/callback/oidc`,
      redirectUrl: JSON.stringify(redirectUrls),
    });

    return NextResponse.json({
      clientID: connection.clientID,
      clientSecret: connection.clientSecret,
      oidcIssuer: externalUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
};

export const dynamic = "force-dynamic";
