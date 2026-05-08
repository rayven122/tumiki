import { app, BrowserWindow } from "electron";
import { join } from "path";
import { APP_INDEX_URL } from "./shared/app-protocol";

// 解決ベースディレクトリ（production: bundle Resources、dev: apps/desktop/resources）
const getResourcesBaseDir = (): string =>
  app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "resources");

// Win/Linux のウィンドウフレームアイコンを解決する。
// macOS は .app バンドル内の .icns が Dock/メニューバーで使われるため未指定。
const resolveWindowIcon = (): string | undefined => {
  if (process.platform === "darwin") return undefined;
  const baseDir = getResourcesBaseDir();
  return process.platform === "win32"
    ? join(baseDir, "icon.ico")
    : join(baseDir, "icon.png");
};

// 開発時の macOS Dock アイコンを tumiki ロゴで上書きする。
// production では .app バンドルの .icns が使われるため上書き不要。
const applyDevDockIcon = (): void => {
  if (process.platform !== "darwin" || app.isPackaged) return;
  app.dock?.setIcon(join(getResourcesBaseDir(), "icon.png"));
};

export const createMainWindow = (): BrowserWindow => {
  applyDevDockIcon();

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: resolveWindowIcon(),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // electron-viteが設定する環境変数からrenderer URLを取得
  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // production では file:// ではなくカスタム tumiki-bundle:// スキームで読み込む。
    // file:// だと `<img src="/logos/foo.svg">` がOSルートを指してしまうため。
    mainWindow.loadURL(APP_INDEX_URL);
  }

  return mainWindow;
};
