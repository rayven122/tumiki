import { AgentsPageClient } from "./_components/AgentsPageClient";

type AgentsPageProps = {
  params: Promise<{
    orgSlug: string;
  }>;
};

export default async function AgentsPage({ params }: AgentsPageProps) {
  const { orgSlug } = await params;

  return <AgentsPageClient orgSlug={orgSlug} />;
}
