import { Hono } from "hono";
import { handle } from "hono/vercel";

import { closeServer, getServer, getTransport } from "@/lib/server-state";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Context } from "hono";
import type { ServerResponse } from "http";

export const runtime = "nodejs";

const app = new Hono().basePath("/api/hono");

// SSEエンドポイント
app.get("/sse", async (c: Context) => {
	const server = await getServer();
	const nodeRes = c.res as unknown as ServerResponse;
	const transport = new SSEServerTransport("/api/message", nodeRes);

	await server.connect(transport);

	server.onerror = (err: Error) => {
		console.error(`サーバーエラー: ${err.stack}`);
	};

	server.onclose = async () => {
		console.log("サーバーが閉じられました");
		if (process.env.KEEP_SERVER_OPEN !== "1") {
			await closeServer();
		}
	};
});

// メッセージエンドポイント
app.post("/message", async (c: Context) => {
	const transport = getTransport();

	if (!transport) {
		return c.json({ error: "SSE接続が確立されていません" }, 400);
	}

	try {
		return await transport.handleNextPostMessage(c.req.raw);
	} catch (error) {
		console.error("メッセージ処理エラー:", error);
		return c.json({ error: "メッセージの処理に失敗しました" }, 500);
	}
});

export type AppType = typeof app;

export const GET = handle(app);
export const POST = handle(app);
