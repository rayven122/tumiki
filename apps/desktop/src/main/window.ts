import { BrowserWindow } from "electron";
import { join } from "path";
import { pathToFileURL } from "url";

export const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 開発環境とプロダクション環境で異なるURLをロード
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // 本番環境: file:// URLを使用してHTMLをロード
    const indexPath = join(__dirname, "../renderer/index.html");
    mainWindow.loadURL(pathToFileURL(indexPath).href);
    // デバッグ用に一時的にDevToolsを開く
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
};
