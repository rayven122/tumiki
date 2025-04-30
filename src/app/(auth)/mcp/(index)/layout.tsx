export default function McpLayout({ tabs }: { tabs: React.ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">MCPサーバー管理</h1>
      </div>

      {tabs}
    </div>
  );
}
