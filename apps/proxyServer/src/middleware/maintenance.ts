import type { Request, Response, NextFunction } from "express";
import { config } from "../libs/config.js";
import { logger } from "../libs/logger.js";
import type { MiddlewareFunction } from "../types/middleware.js";

/**
 * メンテナンスモードミドルウェア
 * メンテナンスモード中はすべてのリクエストに503を返却
 */
export const maintenanceMiddleware = (): MiddlewareFunction => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // メンテナンスモードが有効かチェック
    if (!config.maintenance.enabled) {
      next();
      return;
    }

    // ヘルスチェックエンドポイントは常に許可（監視用）
    if (req.path === "/health" || req.path === "/") {
      next();
      return;
    }

    // クライアントIPの取得
    const forwardedFor = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const clientIP =
      (typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0]?.trim()
        : forwardedFor?.[0]) ||
      realIp ||
      req.ip ||
      "";

    // 許可IPリストにあるかチェック
    const clientIPStr =
      typeof clientIP === "string" ? clientIP : clientIP.toString();
    if (clientIPStr && config.maintenance.allowedIPs.includes(clientIPStr)) {
      logger.info(
        `Maintenance mode: Allowed IP ${clientIPStr} accessed ${req.path}`,
      );
      next();
      return;
    }

    // メンテナンスレスポンスを返却
    logger.info(
      `Maintenance mode: Blocked access from ${String(clientIP)} to ${req.path}`,
    );

    res.status(503).json({
      error: "Service Unavailable",
      maintenance: true,
      message: config.maintenance.message,
      estimatedEndTime: config.maintenance.endTime,
    });
  };
};
