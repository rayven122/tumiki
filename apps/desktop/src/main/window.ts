import { BrowserWindow } from "electron";
import { join } from "path";

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

  // electron-viteが設定する環境変数からrenderer URLを取得
  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
};
