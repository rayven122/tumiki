import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./db";
import { setupAuthIpc } from "./ipc/auth";
import { setupCatalogIpc } from "./ipc/catalog";
import * as logger from "./utils/logger";

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = createMainWindow();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// アプリケーション準備完了時
app
  .whenReady()
  .then(async () => {
    // データベース初期化
    await initializeDb();

    // IPC ハンドラー登録
    setupAuthIpc();
    setupCatalogIpc();

    createWindow();

    app.on("activate", () => {
      // macOSでDockアイコンクリック時、ウィンドウがなければ作成
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    logger.error("Failed to initialize application", error);
    app.quit();
  });

// すべてのウィンドウが閉じられた時
app.on("window-all-closed", () => {
  // macOS以外はアプリケーションを終了
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// アプリケーション終了時にデータベース接続をクリーンアップ
// Electronはasyncイベントハンドラを待たないため、preventDefaultで終了を遅延
// app.exit() が再度 will-quit を発火するため、フラグで無限ループを防止
let isQuitting = false;
app.on("will-quit", (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();
  closeDb()
    .then(() => {
      logger.info("Database connection closed successfully");
    })
    .catch((error) => {
      logger.error(
        "Failed to close database during app quit",
        error instanceof Error ? error : { error },
      );
    })
    .finally(() => {
      app.exit();
    });
});
