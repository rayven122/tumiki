import { McpsPageClient } from "./_components/McpsPageClient";

type McpsPageProps = {
  params: Promise<{
    orgSlug: string;
  }>;
};

export default async function McpsPage({ params }: McpsPageProps) {
  const { orgSlug } = await params;

  return <McpsPageClient orgSlug={orgSlug} />;
}
