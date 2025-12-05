import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./db";
import { setupAuthIpc } from "./ipc/auth";
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

// アプリケーション終了前にデータベース接続をクリーンアップ
app.on("before-quit", async (event) => {
  // イベントをキャンセルして非同期処理を完了させる
  event.preventDefault();

  try {
    await closeDb();
    logger.info("Database connection closed successfully");
  } catch (error) {
    logger.error(
      "Failed to close database during app quit",
      error instanceof Error ? error : { error },
    );
  } finally {
    // データベースのクローズ処理が完了したら、アプリを終了
    // before-quitを再度トリガーしないようにリスナーを削除
    app.removeAllListeners("before-quit");
    app.quit();
  }
});
