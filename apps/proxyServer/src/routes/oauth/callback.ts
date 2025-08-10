import type { Request, Response } from "express";
import { sendOAuthErrorResponse } from "../../utils/errorResponse.js";
import { oauthStore } from "../../utils/oauthStore.js";

/**
 * OAuth Callback Endpoint
 * Auth0からのコールバックを受け取り、元のクライアントにリダイレクトする
 * GET /oauth/callback
 */
export const handleOAuthCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query;

    // Auth0からのエラーレスポンスの処理
    if (error) {
      console.error("Auth0 callback error:", error, error_description);
      // エラーページまたはデフォルトのリダイレクト先に転送
      res.redirect(
        `${process.env.MCP_PROXY_URL || "http://localhost:8080"}/oauth/error?error=${encodeURIComponent(
          error as string,
        )}&error_description=${encodeURIComponent(
          (error_description as string) || "",
        )}`,
      );
      return;
    }

    // 必須パラメータの確認
    if (!code || !state) {
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "Missing code or state parameter",
      );
      return;
    }

    // stateパラメータをデコードして元のクライアント情報を復元
    let proxyState: {
      originalState?: string;
      originalClientId?: string;
      originalRedirectUri?: string;
    };
    try {
      const decodedState = Buffer.from(state as string, "base64url").toString(
        "utf-8",
      );
      proxyState = JSON.parse(decodedState) as {
        originalState?: string;
        originalClientId?: string;
        originalRedirectUri?: string;
      };
    } catch (parseError) {
      console.error("Failed to parse state:", parseError);
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "Invalid state parameter",
      );
      return;
    }

    const originalState = proxyState.originalState;
    const originalClientId = proxyState.originalClientId;
    const originalRedirectUri = proxyState.originalRedirectUri;

    if (!originalRedirectUri) {
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "Original redirect URI not found in state",
      );
      return;
    }

    // 元のクライアントのredirect_uriにリダイレクト
    const clientRedirectUrl = new URL(originalRedirectUri);

    // 認可コードとstateを元のクライアントに転送
    clientRedirectUrl.searchParams.set("code", code as string);
    if (originalState) {
      clientRedirectUrl.searchParams.set("state", originalState);
    }

    // クライアント情報をメモリストアに保存
    // （token交換時に使用するため）
    oauthStore.setCodeMapping(code as string, {
      code: code as string,
      originalClientId: originalClientId || "",
      originalRedirectUri: originalRedirectUri || "",
    });

    // 元のクライアントにリダイレクト
    res.redirect(clientRedirectUrl.toString());
  } catch (error) {
    console.error("OAuth callback error:", error);
    sendOAuthErrorResponse(
      res,
      500,
      "server_error",
      "Callback processing failed",
    );
  }
};
