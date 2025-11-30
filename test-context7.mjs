import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const server = {
  name: "custom-context7",
  url: "https://mcp.context7.com/mcp"
};
const headers = {}; // 認証なしの場合

const client = new Client({
  name: server.name,
  version: "1.0.0",
});

try {
  console.log("[Test] 接続開始:", {
    serverName: server.name,
    serverUrl: server.url,
    headers: headers,
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(server.url),
    {
      requestInit: {
        headers: {
          ...headers,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
      },
    },
  );

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("タイムアウト（10秒）"));
    }, 10000);
  });

  await Promise.race([client.connect(transport), timeoutPromise]);
  console.log("[Test] 接続成功");

  const listTools = await client.listTools();
  console.log(`[Test] ツール取得成功: ${listTools.tools.length}個`);
  console.log("ツール:", listTools.tools.map(t => t.name));

  await client.close();
} catch (error) {
  console.error("[Test] エラー:", error);
  process.exit(1);
}
