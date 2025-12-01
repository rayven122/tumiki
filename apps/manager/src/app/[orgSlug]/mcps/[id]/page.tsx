import { ServerDetailPageClient } from "./_components/ServerDetailPageClient";

type ServerDetailPageProps = {
  params: Promise<{
    orgSlug: string;
    id: string;
  }>;
};

export default async function ServerDetailPage({
  params,
}: ServerDetailPageProps) {
  const { orgSlug, id } = await params;

  return <ServerDetailPageClient orgSlug={orgSlug} serverId={id} />;
}
