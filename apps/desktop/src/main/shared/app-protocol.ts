import { protocol, net } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as logger from "./utils/logger";

// Production ビルドのレンダラーは file:// で読み込まれるため、
// `<img src="/logos/foo.svg">` のような絶対パスがOSのファイルシステムルートを参照してしまう。
// カスタムスキーム `tumiki-bundle://bundle/...` を使い、レンダラー dist 配下を起点に解決する。
// （deep link 用の `tumiki://` と区別するため `-bundle` を付与）
export const APP_SCHEME = "tumiki-bundle";
export const APP_BUNDLE_HOST = "bundle";
export const APP_INDEX_URL = `${APP_SCHEME}://${APP_BUNDLE_HOST}/index.html`;

// レンダラー dist のルートディレクトリ（main ビルド出力からの相対パス）
// electron-vite の出力構造: dist-electron/main/index.cjs と dist-electron/renderer/
export const getRendererRoot = (mainDir: string): string =>
  path.join(mainDir, "../renderer");

// `app.ready` より前に呼ぶ必要がある（Electronの仕様）。
export const registerAppProtocolSchemes = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        // 静的アセット配信のみを目的とするため、レンダラーからの fetch は許可しない
        supportFetchAPI: false,
      },
    },
  ]);
};

// パストラバーサル防止判定。
// `pathname` が rendererRoot 配下に収まるパスに解決される場合のみ true。
// 解決後の絶対パスを返し、安全でない場合は null。
export const resolveSafePath = (
  rendererRoot: string,
  pathname: string,
): string | null => {
  // WHATWG URL 仕様上、カスタムスキームでは pathname が
  // パーセントエンコードされたまま返るため明示的にデコードする
  const decodedPath = decodeURIComponent(pathname);
  // 先頭に `.` を付与して相対パスとして resolve することで、
  // `/etc/passwd` のような絶対パスを rendererRoot 配下にマップする
  const resolved = path.resolve(rendererRoot, `.${decodedPath}`);
  const relative = path.relative(rendererRoot, resolved);
  const isSafe =
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative));
  return isSafe ? resolved : null;
};

// `app.whenReady()` 後に呼ぶ。レンダラー dist 配下のファイルを返す。
export const handleAppProtocol = (rendererRoot: string): void => {
  protocol.handle(APP_SCHEME, (req) => {
    const { host, pathname } = new URL(req.url);

    if (host !== APP_BUNDLE_HOST) {
      return new Response("Not Found", { status: 404 });
    }

    const resolved = resolveSafePath(rendererRoot, pathname);
    if (!resolved) {
      return new Response("Forbidden", { status: 403 });
    }

    // net.fetch が失敗した場合は明示的に 404 を返す
    // （reject すると Electron が ERR_FAILED を返し DevTools のネットワークタブで原因が分かりづらいため）
    return net.fetch(pathToFileURL(resolved).toString()).catch((error) => {
      logger.warn("tumiki-bundle:// プロトコルのファイル取得に失敗", {
        path: resolved,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response("Not Found", { status: 404 });
    });
  });
};
