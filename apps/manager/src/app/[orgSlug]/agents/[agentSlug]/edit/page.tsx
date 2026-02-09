import { EditAgentPageClient } from "./_components/EditAgentPageClient";

type EditAgentPageProps = {
  params: Promise<{
    orgSlug: string;
    agentSlug: string;
  }>;
};

const EditAgentPage = async ({ params }: EditAgentPageProps) => {
  const { orgSlug, agentSlug } = await params;

  return <EditAgentPageClient orgSlug={orgSlug} agentSlug={agentSlug} />;
};

export default EditAgentPage;
