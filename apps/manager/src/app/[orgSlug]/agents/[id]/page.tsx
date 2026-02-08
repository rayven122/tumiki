import { AgentDetailPageClient } from "./_components/AgentDetailPageClient";

type AgentDetailPageProps = {
  params: Promise<{
    orgSlug: string;
    id: string;
  }>;
};

export default async function AgentDetailPage({
  params,
}: AgentDetailPageProps) {
  const { orgSlug, id } = await params;

  return <AgentDetailPageClient orgSlug={orgSlug} agentId={id} />;
}
