/**
 * OAuthコールバック受信用ローカルループバックHTTPサーバー
 *
 * RFC 8252 (OAuth 2.0 for Native Apps) §7.3 に準拠した方式。
 * 固定ポート（MCP_OAUTH_LOOPBACK_PORT）で `/callback` を受け、
 * 認可コードを受信したら即座にサーバーを閉じる。
 *
 * カスタムプロトコル（tumiki://）に代わるOAuthリダイレクト受信機構。
 * HubSpot/Asana/MoneyForward等のカスタムスキーム非対応サービスにも対応する。
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import {
  MCP_OAUTH_LOOPBACK_HOST,
  MCP_OAUTH_LOOPBACK_PORT,
  MCP_OAUTH_CALLBACK_PATH,
} from "../../../shared/oauth/redirect-uri";

/** ループバックサーバーのインスタンス */
export type LoopbackServer = {
  /** 認可サーバーに登録するredirect_uri（例: http://127.0.0.1:33418/callback） */
  redirectUri: string;
  /** 認可コード受信を待機するPromise（コールバックURLを返す） */
  waitForCallback: (timeoutMs: number) => Promise<string>;
  /** サーバーを閉じる（多重呼び出し可、冪等） */
  close: () => Promise<void>;
};

/** ポート占有時のエラーコード（rendererで識別するため） */
export const LOOPBACK_PORT_IN_USE = "LOOPBACK_PORT_IN_USE";

const renderResultPage = (
  title: string,
  message: string,
): string => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f1115;color:#e6e8ee;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#1a1d24;padding:32px 40px;border-radius:12px;max-width:420px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  h1{font-size:18px;margin:0 0 12px}
  p{font-size:14px;color:#a5acba;margin:0;line-height:1.6}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;

const writeHtml = (res: ServerResponse, status: number, html: string): void => {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
};

const isAddressInUseError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "EADDRINUSE";
};

/**
 * ループバックHTTPサーバーを起動する
 *
 * デフォルトでは固定ポート（MCP_OAUTH_LOOPBACK_PORT）で起動する。
 * テスト時など並列実行で衝突を避けたい場合は `port: 0` を渡してOSに割り当てさせる。
 * `/callback` 以外のリクエストには 404 を返す。
 *
 * 固定ポートが既に使用中の場合は、エラーコード `LOOPBACK_PORT_IN_USE` を持つ
 * Errorをthrowする。
 */
export const startLoopbackServer = async (options?: {
  port?: number;
}): Promise<LoopbackServer> => {
  const targetPort = options?.port ?? MCP_OAUTH_LOOPBACK_PORT;

  let resolveCallback: ((url: string) => void) | null = null;
  let rejectCallback: ((error: Error) => void) | null = null;
  let received = false;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? "/", `http://${MCP_OAUTH_LOOPBACK_HOST}`);

      if (url.pathname !== MCP_OAUTH_CALLBACK_PATH) {
        writeHtml(
          res,
          404,
          renderResultPage("Not Found", "リクエストされたパスは存在しません。"),
        );
        return;
      }

      if (received) {
        // 二重受信は無視（保険）
        writeHtml(
          res,
          200,
          renderResultPage("認証完了", "このウィンドウは閉じて構いません。"),
        );
        return;
      }
      received = true;

      const oauthError = url.searchParams.get("error");
      if (oauthError) {
        const desc = url.searchParams.get("error_description") ?? oauthError;
        writeHtml(
          res,
          200,
          renderResultPage("認証エラー", `OAuth認証エラー: ${desc}`),
        );
        resolveCallback?.(url.toString());
        return;
      }

      writeHtml(
        res,
        200,
        renderResultPage(
          "認証完了",
          "Tumikiに戻ってください。このウィンドウは閉じて構いません。",
        ),
      );
      resolveCallback?.(url.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeHtml(res, 500, renderResultPage("エラー", message));
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      server.removeListener("listening", onListening);
      if (isAddressInUseError(error)) {
        const wrapped = new Error(
          `OAuthコールバック用ポート ${targetPort} が使用中です。他のTumikiプロセスを終了してから再試行してください。`,
        );
        (wrapped as NodeJS.ErrnoException).code = LOOPBACK_PORT_IN_USE;
        reject(wrapped);
        return;
      }
      reject(error);
    };
    const onListening = (): void => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(targetPort, MCP_OAUTH_LOOPBACK_HOST);
  });

  const address = server.address() as AddressInfo | null;
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("ループバックサーバーのアドレス取得に失敗しました");
  }

  const redirectUri = `http://${MCP_OAUTH_LOOPBACK_HOST}:${address.port}${MCP_OAUTH_CALLBACK_PATH}`;

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  };

  const waitForCallback = (timeoutMs: number): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!received) {
          rejectCallback?.(new Error("OAuth認証がタイムアウトしました"));
          void close();
        }
      }, timeoutMs);
      // タイマー解除込みのresolve/rejectを差し替え
      resolveCallback = (url) => {
        clearTimeout(timer);
        resolve(url);
      };
      rejectCallback = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });
  };

  return { redirectUri, waitForCallback, close };
};
