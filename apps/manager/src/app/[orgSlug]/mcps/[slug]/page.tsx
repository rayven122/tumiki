import { ServerDetailPageClient } from "./_components/ServerDetailPageClient";

type ServerDetailPageProps = {
  params: Promise<{
    orgSlug: string;
    slug: string;
  }>;
};

export default async function ServerDetailPage({
  params,
}: ServerDetailPageProps) {
  const { orgSlug, slug } = await params;

  return <ServerDetailPageClient orgSlug={orgSlug} serverSlug={slug} />;
}
