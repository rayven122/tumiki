import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./shared/db";
import { setupAuthIpc } from "./ipc/auth";
import { setupCatalogIpc } from "./features/catalog/catalog.ipc";
import { setupMcpIpc } from "./features/mcp/mcp.ipc";
import { seedCatalogs } from "./features/catalog/catalog.service";
import * as logger from "./shared/utils/logger";

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

    // カタログ初期データを投入（冪等）
    await seedCatalogs();

    // IPC ハンドラー登録
    setupAuthIpc();
    setupCatalogIpc();
    setupMcpIpc();

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
