import { NextResponse, type NextRequest } from "next/server";
import { getJackson, isJacksonConfigured, resolveExternalUrl } from "./index";

/// SCIM 設定画面へリダイレクトするときのパス（authorize/callback で共有）
const SETTINGS_PATH = "/admin/settings";

/// 外部公開 URL を起点に設定画面の URL を組み立てる
/// req.nextUrl.origin は Next.js standalone (HOSTNAME=0.0.0.0) で
/// container 内部の `https://0.0.0.0:3100` を返してしまうため、
/// 環境変数経由の externalUrl を使ってブラウザが到達可能な URL を返す
const buildSettingsUrl = (params: URLSearchParams) =>
  `${resolveExternalUrl()}${SETTINGS_PATH}?${params.toString()}`;

/**
 * SCIM OAuth ハンドラからエラーコード付きで設定画面へリダイレクトする
 * authorize / callback で共通利用する
 */
export const redirectToSettingsWithError = (_req: NextRequest, code: string) =>
  NextResponse.redirect(
    buildSettingsUrl(new URLSearchParams({ scim_error: code })),
  );

/**
 * SCIM OAuth ハンドラから成功通知付きで設定画面へリダイレクトする
 */
export const redirectToSettingsWithSuccess = (
  _req: NextRequest,
  code: string,
) =>
  NextResponse.redirect(
    buildSettingsUrl(new URLSearchParams({ scim_success: code })),
  );

/**
 * jackson が未設定なら 503 を返し、設定済みならインスタンスを返す
 *
 * 各 API ルートで getJackson() を直接呼ぶ前に通すことで、
 * 環境変数未設定時に 500 で全体障害にせず graceful に 503 を返せる。
 */
export const ensureJackson = async () => {
  if (!isJacksonConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 },
      ),
    };
  }
  try {
    const instance = await getJackson();
    return { ok: true as const, jackson: instance };
  } catch (e) {
    console.error("[jackson] initialization failed:", e);
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 },
      ),
    };
  }
};

/**
 * OAuth/SAML ルートの汎用エラーレスポンス
 *
 * 詳細エラーはサーバーログに記録し、外部には RFC 6749 準拠の
 * 標準エラーコードのみ返す（情報漏洩防止）。
 */
export const oauthError = (
  context: string,
  e: unknown,
  errorCode = "invalid_request",
  status = 400,
): NextResponse => {
  console.error(`[${context}] error:`, e);
  return NextResponse.json({ error: errorCode }, { status });
};

/**
 * SAML/OIDC の自動 POST フォーム HTML を返すレスポンスを生成
 *
 * Clickjacking と Open Redirect を防ぐため CSP / X-Frame-Options を付与。
 * form-action 'self' により form がアプリ自身以外に POST されるのを防ぐ。
 */
export const htmlFormResponse = (html: string): NextResponse =>
  new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; form-action 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
      "Cache-Control": "no-store",
    },
  });
