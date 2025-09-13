/**
 * MCP Server Instance ID認証テストスクリプト
 * Instance ID URLを使用したx-api-keyヘッダー認証のテスト
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// 環境変数から設定を取得
const INSTANCE_ID = process.env.MCP_INSTANCE_ID || "your-instance-id";
const API_KEY = process.env.TEST_API_KEY || "your-api-key";
const PROXY_URL = process.env.MCP_PROXY_URL || "http://localhost:8080";

async function testInstanceIdAuth() {
  console.log("🚀 Testing MCP Server Instance ID authentication...");
  console.log(`📍 Proxy URL: ${PROXY_URL}/mcp/${INSTANCE_ID}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
  console.log("");

  const TIMEOUT = 30000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Connection timeout after 30 seconds")),
      TIMEOUT,
    );
  });

  try {
    // 1. Instance ID URLでTransportを作成
    console.log("1️⃣ Creating transport with Instance ID URL...");
    const transport = new StreamableHTTPClientTransport(
      new URL(`${PROXY_URL}/mcp/${INSTANCE_ID}`),
      {
        // x-api-keyヘッダーを設定
        requestInit: {
          headers: {
            "x-api-key": API_KEY,
          },
        },
      },
    );

    // 2. Clientを作成
    console.log("2️⃣ Creating MCP Client...");
    const client = new Client(
      {
        name: "test-instance-id-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          sampling: {},
        },
      },
    );

    // 3. サーバーに接続
    console.log("3️⃣ Connecting to server with x-api-key header...");
    await Promise.race([client.connect(transport), timeoutPromise]);
    console.log("✅ Successfully connected with Instance ID authentication!");
    console.log("");

    // 4. 利用可能なツールを取得
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

    // 5. テストツール呼び出し
    if (toolsResponse.tools && toolsResponse.tools.length > 0) {
      const firstTool = toolsResponse.tools[0];
      if (firstTool) {
        console.log(`5️⃣ Testing tool call: ${firstTool.name}...`);

        try {
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

    // 6. 接続を閉じる
    console.log("6️⃣ Closing connection...");
    await client.close();
    console.log("✅ Connection closed successfully!");
    console.log("");

    console.log("🎉 Instance ID authentication test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error);

    if (error instanceof Error) {
      console.error("");
      console.error("Error details:");
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);

      // エラータイプに応じたトラブルシューティング
      if (error.message.includes("401")) {
        console.error("");
        console.error("💡 Authentication error troubleshooting:");
        console.error("  - Verify the API key is valid for this Instance ID");
        console.error("  - Check if the Instance ID exists and is active");
        console.error(
          "  - Ensure the API key has permission for this instance",
        );
      } else if (error.message.includes("404")) {
        console.error("");
        console.error("💡 Not found error troubleshooting:");
        console.error("  - Verify the Instance ID is correct");
        console.error("  - Check if the MCP server instance exists");
      } else if (error.message.includes("timeout")) {
        console.error("");
        console.error("💡 Timeout troubleshooting:");
        console.error("  - Check if proxy server is running on port 8080");
        console.error("  - Verify network connectivity");
        console.error("  - Check if MCP server behind proxy is responding");
      }
    }

    process.exit(1);
  }
}

// メイン実行
testInstanceIdAuth().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
