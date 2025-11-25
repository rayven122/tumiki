import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./db";
import { setupAuthIpc } from "./ipc/auth";

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = createMainWindow();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// アプリケーション準備完了時
app.whenReady().then(async () => {
  // データベース初期化
  await initializeDb();

  // IPC ハンドラー登録
  setupAuthIpc();

  createWindow();

  app.on("activate", () => {
    // macOSでDockアイコンクリック時、ウィンドウがなければ作成
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// すべてのウィンドウが閉じられた時
app.on("window-all-closed", () => {
  // macOS以外はアプリケーションを終了
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// アプリケーション終了前にデータベース接続をクリーンアップ
app.on("before-quit", async () => {
  await closeDb();
});
