import { EditAgentPageClient } from "./_components/EditAgentPageClient";

type EditAgentPageProps = {
  params: Promise<{
    orgSlug: string;
    id: string;
  }>;
};

const EditAgentPage = async ({ params }: EditAgentPageProps) => {
  const { orgSlug, id } = await params;

  return <EditAgentPageClient orgSlug={orgSlug} agentId={id} />;
};

export default EditAgentPage;
