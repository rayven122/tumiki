import express, { type Request, type Response } from "express";
import { establishConnection } from "./connection/sseConnection.js";
import { handleMessage } from "./handlers/messageHandler.js";
import { startMaintenanceTasks } from "./lifecycle/maintenance.js";
import { setupShutdownHandlers } from "./lifecycle/shutdown.js";
import { initializeRecoveryManager } from "./connection/recoveryManager.js";

const app = express();
app.use(express.json({ limit: "10mb" })); // JSONペイロードサイズ制限

app.get("/", (req, res) => {
  console.log("Received GET request to /");
  res.send("MCP Proxy Server is running. Use /mcp to establish an SSE stream.");
});

// SSE endpoint for establishing the stream
app.get("/mcp", async (req: Request, res: Response) => {
  console.log("Received GET request to /mcp (establishing SSE stream)");
  await establishConnection(req, res);
});

// Messages endpoint for receiving client JSON-RPC requests
app.post("/messages", handleMessage);

// 回復マネージャーを初期化
const recoveryManagerCleanup = initializeRecoveryManager();

// メンテナンスタスクを開始
startMaintenanceTasks();

// シャットダウンハンドラーを設定（回復マネージャーのクリーンアップ関数を渡す）
setupShutdownHandlers(recoveryManagerCleanup);

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`MCP Proxy Server listening on port ${PORT}`);
  console.log(
    `Ready to accept SSE connections at http://localhost:${PORT}/mcp`,
  );
});
