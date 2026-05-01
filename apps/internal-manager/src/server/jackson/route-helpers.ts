import { NextResponse } from "next/server";
import { getJackson, isJacksonConfigured } from "./index";

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
