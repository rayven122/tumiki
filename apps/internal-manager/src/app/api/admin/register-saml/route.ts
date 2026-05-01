import { NextResponse, type NextRequest } from "next/server";
import { getJackson, resolveExternalUrl } from "@/server/jackson";

/**
 * SAML Connection 一時登録 API（使用後に削除すること）
 *
 * Authorization: Bearer <ADMIN_REGISTER_SECRET> で認証。
 * JSON body で rawMetadata (XML 文字列) を受け取り Connection を登録する。
 */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const secret = process.env.ADMIN_REGISTER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
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

  try {
    const { connectionAPIController } = await getJackson();

    const connection = await connectionAPIController.createSAMLConnection({
      tenant,
      product,
      rawMetadata,
      defaultRedirectUrl: `${externalUrl}/api/auth/callback/oidc`,
      redirectUrl: JSON.stringify([
        `${externalUrl}/api/auth/callback/oidc`,
        `${externalUrl}/api/auth/callback/jackson`,
      ]),
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
