import { api } from "@/trpc/server";
import { McpTemplateForm } from "../../_components/McpTemplateForm";

type EditMcpTemplatePageProps = {
  params: Promise<{ orgSlug: string; id: string }>;
};

const EditMcpTemplatePage = async ({ params }: EditMcpTemplatePageProps) => {
  const { orgSlug, id } = await params;
  const decodedSlug = decodeURIComponent(orgSlug);

  const template = await api.mcpServerTemplate.get({ id });

  // フォームに渡す初期値を準備
  const defaultValues = {
    name: template.name,
    normalizedName: template.normalizedName,
    description: template.description ?? undefined,
    tags: template.tags.join(", "),
    iconPath: template.iconPath ?? undefined,
    transportType: template.transportType,
    command: template.command ?? undefined,
    args: template.args.join(", "),
    url: template.url ?? undefined,
    envVarKeys: template.envVarKeys.join(", "),
    authType: template.authType,
    oauthProvider: template.oauthProvider ?? undefined,
    oauthScopes: template.oauthScopes.join(", "),
    useCloudRunIam: template.useCloudRunIam,
    visibility: template.visibility,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MCPテンプレート編集</h1>
        <p className="text-muted-foreground text-sm">
          テンプレート「{template.name}」を編集します
        </p>
      </div>

      <McpTemplateForm
        orgSlug={decodedSlug}
        templateId={id}
        defaultValues={defaultValues}
      />
    </div>
  );
};

export default EditMcpTemplatePage;
