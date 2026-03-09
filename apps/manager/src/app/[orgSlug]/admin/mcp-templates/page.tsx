import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { McpTemplateList } from "./_components/McpTemplateList";

type McpTemplatesPageProps = {
  params: Promise<{ orgSlug: string }>;
};

const McpTemplatesPage = async ({ params }: McpTemplatesPageProps) => {
  const { orgSlug } = await params;
  const decodedSlug = decodeURIComponent(orgSlug);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>MCPサーバーテンプレート</CardTitle>
            <p className="text-muted-foreground text-sm">
              組織内で再利用可能なMCPサーバーテンプレートを管理します
            </p>
          </div>
          <Link href={`/${decodedSlug}/admin/mcp-templates/new`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <McpTemplateList orgSlug={decodedSlug} />
        </CardContent>
      </Card>
    </div>
  );
};

export default McpTemplatesPage;
