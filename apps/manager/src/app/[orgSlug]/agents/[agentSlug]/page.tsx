import { AgentDetailPageClient } from "./_components/AgentDetailPageClient";

type AgentDetailPageProps = {
  params: Promise<{
    orgSlug: string;
    agentSlug: string;
  }>;
};

export default async function AgentDetailPage({
  params,
}: AgentDetailPageProps) {
  const { orgSlug, agentSlug } = await params;

  return <AgentDetailPageClient orgSlug={orgSlug} agentSlug={agentSlug} />;
}
