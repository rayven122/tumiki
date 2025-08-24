/**
 * OAuth Callback Endpoint
 * OAuth認証プロバイダーからのコールバックを処理
 */

import type { Request, Response, NextFunction } from "express";

type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;
import { createOAuthManager } from "@tumiki/utils/server";
import { logger } from "../../libs/logger.js";

/**
 * OAuth認証コールバックを処理
 * GET /oauth/callback/:mcpServerId
 *
 * Query Parameters:
 * - code: 認証コード
 * - state: セッション状態
 * - error?: エラーコード
 * - error_description?: エラー説明
 */
export const handleOAuthCallback: RequestHandler = async (req, res) => {
  try {
    const { mcpServerId } = req.params;
    const { code, state, error, error_description } = req.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    logger.info("Processing OAuth callback", {
      mcpServerId,
      hasCode: !!code,
      state,
      error,
    });

    // 必須パラメータのチェック
    if (!state || typeof state !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "State parameter is required",
      });
      return;
    }

    // エラーレスポンスの処理
    if (error) {
      logger.warn("OAuth callback with error", {
        mcpServerId,
        error,
        error_description,
      });

      // クライアントにエラーを通知（HTMLページとして）
      res.send(
        generateCallbackHTML({
          success: false,
          error: String(error),
          errorDescription: error_description
            ? String(error_description)
            : undefined,
        }),
      );
      return;
    }

    // 認証コードが必要
    if (!code || typeof code !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "Authorization code is required",
      });
      return;
    }

    // OAuthManagerインスタンスを作成
    const callbackBaseUrl = `${req.protocol}://${req.get("host")}`;
    const oauthManager = createOAuthManager({
      callbackBaseUrl,
      enablePKCE: true,
      enableDCR: true,
    });

    // コールバックを処理
    const result = await oauthManager.handleCallback(
      code,
      state,
      error ? String(error) : undefined,
      error_description ? String(error_description) : undefined,
    );

    if (result.success) {
      logger.info("OAuth callback processed successfully", {
        mcpServerId,
        hasToken: !!result.accessToken,
      });

      // 成功ページを表示
      res.send(
        generateCallbackHTML({
          success: true,
          message:
            "OAuth authentication successful. You can close this window.",
        }),
      );
    } else {
      logger.error("OAuth callback processing failed", {
        mcpServerId,
        error: result.error,
      });

      // エラーページを表示
      res.send(
        generateCallbackHTML({
          success: false,
          error: result.error?.error ?? "unknown_error",
          errorDescription: result.error?.error_description,
        }),
      );
    }
  } catch (error) {
    logger.error("OAuth callback failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).send(
      generateCallbackHTML({
        success: false,
        error: "server_error",
        errorDescription: "Internal server error during OAuth callback",
      }),
    );
  }
};

/**
 * コールバック結果を表示するHTMLを生成
 */
const generateCallbackHTML = (params: {
  success: boolean;
  message?: string;
  error?: string;
  errorDescription?: string;
}): string => {
  const { success, message, error, errorDescription } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth Authentication - ${success ? "Success" : "Error"}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
        }
        .icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
        }
        .icon.success {
            background: #10b981;
            color: white;
        }
        .icon.error {
            background: #ef4444;
            color: white;
        }
        h1 {
            margin: 0 0 12px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
        }
        p {
            margin: 0 0 24px;
            color: #6b7280;
            line-height: 1.5;
        }
        .error-details {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 12px;
            margin-top: 16px;
            text-align: left;
        }
        .error-details strong {
            color: #991b1b;
            display: block;
            margin-bottom: 4px;
        }
        .error-details span {
            color: #dc2626;
            font-size: 14px;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background: #5a67d8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon ${success ? "success" : "error"}">
            ${success ? "✓" : "✗"}
        </div>
        <h1>${success ? "Authentication Successful" : "Authentication Failed"}</h1>
        <p>${message || (success ? "You have been successfully authenticated." : "An error occurred during authentication.")}</p>
        ${
          error
            ? `
        <div class="error-details">
            <strong>Error:</strong>
            <span>${error}</span>
            ${
              errorDescription
                ? `
            <br><br>
            <strong>Description:</strong>
            <span>${errorDescription}</span>
            `
                : ""
            }
        </div>
        `
            : ""
        }
        <button onclick="window.close()">Close Window</button>
    </div>
    <script>
        // 成功時は自動的にウィンドウを閉じる（5秒後）
        ${
          success
            ? `
        setTimeout(() => {
            window.close();
        }, 5000);
        `
            : ""
        }
        
        // 親ウィンドウに結果を通知
        if (window.opener) {
            window.opener.postMessage({
                type: "oauth-callback",
                success: ${success},
                error: ${error ? `"${error}"` : "null"},
                errorDescription: ${errorDescription ? `"${errorDescription}"` : "null"}
            }, "*");
        }
    </script>
</body>
</html>
  `;
};
