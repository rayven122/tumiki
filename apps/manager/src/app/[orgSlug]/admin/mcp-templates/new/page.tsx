import { McpTemplateForm } from "../_components/McpTemplateForm";

type NewMcpTemplatePageProps = {
  params: Promise<{ orgSlug: string }>;
};

const NewMcpTemplatePage = async ({ params }: NewMcpTemplatePageProps) => {
  const { orgSlug } = await params;
  const decodedSlug = decodeURIComponent(orgSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MCPテンプレート新規作成</h1>
        <p className="text-muted-foreground text-sm">
          組織内で再利用できるMCPサーバーテンプレートを作成します
        </p>
      </div>

      <McpTemplateForm orgSlug={decodedSlug} />
    </div>
  );
};

export default NewMcpTemplatePage;
