import { callTool } from "@/utils/server/getMcpServerTools";

export default async function McpLayout({ tabs }: { tabs: React.ReactNode }) {
  await callTool();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">MCPサーバー管理</h1>
      </div>

      {tabs}
    </div>
  );
}
