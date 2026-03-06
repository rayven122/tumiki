import { CreateAgentPageClient } from "./_components/CreateAgentPageClient";

type CreateAgentPageProps = {
  params: Promise<{
    orgSlug: string;
  }>;
};

export default async function CreateAgentPage({
  params,
}: CreateAgentPageProps) {
  const { orgSlug } = await params;

  return <CreateAgentPageClient orgSlug={orgSlug} />;
}
