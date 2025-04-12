import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { createServer } from "./proxy/mcp-proxy";
import type { NextJsSSEAdapter } from "./sse-adapter";

// サーバーの状態を保存
let serverInstance: Server | null = null;
let cleanupFunction: (() => Promise<void>) | null = null;
let transportInstance: NextJsSSEAdapter | null = null;

export async function getServer() {
	if (!serverInstance) {
		const { server, cleanup } = await createServer();
		serverInstance = server;
		cleanupFunction = cleanup;
	}
	return serverInstance;
}

export function setTransport(transport: NextJsSSEAdapter) {
	transportInstance = transport;
}

export function getTransport() {
	return transportInstance;
}

export async function closeServer() {
	if (serverInstance) {
		if (cleanupFunction) {
			await cleanupFunction();
		}
		await serverInstance.close();
		serverInstance = null;
		cleanupFunction = null;
		transportInstance = null;
	}
}
