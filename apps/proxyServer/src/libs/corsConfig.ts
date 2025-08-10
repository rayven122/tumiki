import { type Request, type Response, type NextFunction } from "express";

/**
 * CORS設定の一元管理
 */
export const corsConfig = {
  /**
   * 許可するオリジンのリスト（共通）
   */
  allowedOrigins: {
    /** 開発環境のオリジン */
    development: [
      "http://localhost:3000",
      "https://local.tumiki.cloud:3000",
      "http://localhost:8080",
      "http://local-server.tumiki.cloud:8080",
      "http://localhost:6274", // MCP Inspector
    ] as const,

    /** 本番環境のオリジン */
    production: [
      "https://server.tumiki.cloud",
      "https://tumiki.cloud",
      "https://www.tumiki.cloud",
      "https://auth.tumiki.cloud",
    ] as const,
  },

  /**
   * すべての許可オリジンを取得
   */
  getAllowedOrigins(): readonly string[] {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const origins = [
      ...this.allowedOrigins.production,
      ...(isDevelopment ? this.allowedOrigins.development : []),
    ];
    return origins;
  },

  /**
   * オリジンが許可されているかチェック
   */
  isAllowedOrigin(origin: string | undefined): boolean {
    if (!origin) return false;

    // 許可リストのチェック
    if (this.getAllowedOrigins().includes(origin)) {
      return true;
    }

    // 開発環境では、localhostの任意のポートを許可
    if (process.env.NODE_ENV !== "production") {
      const localhostPattern = /^http:\/\/localhost:\d+$/;
      if (localhostPattern.test(origin)) {
        return true;
      }
    }

    return false;
  },

  /**
   * CORS許可メソッド
   */
  allowedMethods: ["GET", "POST", "DELETE", "OPTIONS"] as const,

  /**
   * CORS許可ヘッダー
   */
  allowedHeaders: [
    "Content-Type",
    "mcp-session-id",
    "api-key",
    "x-api-key",
    "x-client-id",
    "Authorization",
  ] as const,
};

/**
 * CORSヘッダーを設定するヘルパー関数
 */
export const setCorsHeaders = (
  req: Request,
  res: Response,
  options?: {
    allowAllIfNoOrigin?: boolean;
    additionalOrigins?: string[];
  },
): void => {
  const origin = req.headers.origin;

  // オリジンヘッダーがない場合（サーバー間通信など）
  if (!origin && options?.allowAllIfNoOrigin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return;
  }

  // 追加のオリジンをチェック
  const additionalOrigins = options?.additionalOrigins || [];
  const isAdditionalOrigin = additionalOrigins.includes(origin || "");

  // 許可されたオリジンの場合
  if (origin && (corsConfig.isAllowedOrigin(origin) || isAdditionalOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // メソッドとヘッダーの設定
  res.setHeader(
    "Access-Control-Allow-Methods",
    corsConfig.allowedMethods.join(", "),
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    corsConfig.allowedHeaders.join(", "),
  );
};

/**
 * CORSミドルウェア
 */
export const corsMiddleware = (options?: {
  allowAllIfNoOrigin?: boolean;
  additionalOrigins?: string[];
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    setCorsHeaders(req, res, options);

    // OPTIONSリクエストの場合は早期レスポンス
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }

    next();
  };
};
