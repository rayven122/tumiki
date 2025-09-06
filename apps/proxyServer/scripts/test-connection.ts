/**
 * MCP Proxy Server接続テストスクリプト
 * StreamableHttpClientTransportを使用して正しいMCPプロトコルシーケンスで接続をテスト
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// 環境変数からAPIキーを取得（デフォルト値あり）
const API_KEY = process.env.TEST_API_KEY || "tumiki_mcp_xxxxxx";
const PROXY_URL = process.env.MCP_PROXY_URL || "http://localhost:8080";

async function testConnection() {
  console.log("🚀 Starting MCP Proxy Server connection test...");
  console.log(`📍 Proxy URL: ${PROXY_URL}/mcp`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
  console.log("");

  // タイムアウト設定（30秒）
  const TIMEOUT = 30000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Connection timeout after 30 seconds")),
      TIMEOUT,
    );
  });

  try {
    // 1. StreamableHttpClientTransportを作成
    console.log("1️⃣ Creating StreamableHttpClientTransport...");
    const transport = new StreamableHTTPClientTransport(
      new URL(`${PROXY_URL}/mcp?api-key=${API_KEY}`),
    );

    // 2. Clientを作成
    console.log("2️⃣ Creating MCP Client...");
    const client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          sampling: {},
        },
      },
    );

    // 3. サーバーに接続（初期化シーケンスを実行）
    console.log("3️⃣ Connecting to server (initialize)...");
    await Promise.race([client.connect(transport), timeoutPromise]);
    console.log("✅ Successfully connected and initialized!");
    console.log("");

    // 4. サーバー情報を表示（省略 - getServerInfoメソッドは存在しない）
    console.log("📋 Server connected successfully!");

    // 5. 利用可能なツールを取得
    console.log("4️⃣ Fetching available tools...");
    const toolsResponse = await Promise.race([
      client.listTools(),
      new Promise<{
        tools: Array<{
          name: string;
          description?: string;
          inputSchema?: unknown;
        }>;
      }>((_, reject) => {
        setTimeout(
          () => reject(new Error("Tools listing timeout after 10 seconds")),
          10000,
        );
      }),
    ]);

    if (toolsResponse.tools && toolsResponse.tools.length > 0) {
      console.log(`✅ Found ${toolsResponse.tools.length} tools:`);
      toolsResponse.tools.forEach(
        (tool: { name: string; description?: string }, index: number) => {
          console.log(`   ${index + 1}. ${tool.name}`);
          if (tool.description) {
            console.log(`      ${tool.description}`);
          }
        },
      );
    } else {
      console.log("⚠️ No tools available from this server");
    }
    console.log("");

    // 6. テストツール呼び出し（最初のツールを使用）
    if (toolsResponse.tools && toolsResponse.tools.length > 0) {
      const firstTool = toolsResponse.tools[0];
      if (firstTool) {
        console.log(`5️⃣ Testing tool call: ${firstTool.name}...`);

        try {
          // パラメータを準備（スキーマに応じて調整が必要）
          const params = {};

          // inputSchemaがある場合は、必須パラメータを確認
          if (
            firstTool.inputSchema &&
            typeof firstTool.inputSchema === "object"
          ) {
            const schema = firstTool.inputSchema as {
              required?: string[];
              [key: string]: unknown;
            };
            if (schema.required && Array.isArray(schema.required)) {
              console.log(
                `   Required parameters: ${schema.required.join(", ")}`,
              );
            }
          }

          // ツールを呼び出し
          const result = await client.callTool({
            name: firstTool.name,
            arguments: params,
          });

          console.log("✅ Tool call successful!");
          console.log(
            `   Result type: ${Array.isArray(result.content) ? "array" : typeof result.content}`,
          );
          if (result.isError) {
            console.log("⚠️ Tool returned an error:", result.content);
          }
        } catch (error) {
          console.log("⚠️ Tool call failed (this is expected for some tools):");
          console.log(
            `   ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    console.log("");

    // 7. 接続を閉じる
    console.log("6️⃣ Closing connection...");
    await client.close();
    console.log("✅ Connection closed successfully!");
    console.log("");

    console.log("🎉 All tests completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error);

    if (error instanceof Error) {
      console.error("");
      console.error("Error details:");
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);

      // Additional debugging for specific error types
      if (error.message.includes("timeout")) {
        console.error("");
        console.error("💡 Timeout troubleshooting:");
        console.error("  - Check if proxy server is running on port 8080");
        console.error("  - Verify the API key is valid");
        console.error("  - Check if MCP server behind proxy is responding");
      }
    }

    process.exit(1);
  }
}

// メイン実行
testConnection().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
