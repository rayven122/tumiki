import { AddServerPageClient } from "./_components/AddServerPageClient";

type AddServerPageProps = {
  params: Promise<{
    orgSlug: string;
  }>;
};

export default async function AddServerPage({ params }: AddServerPageProps) {
  const { orgSlug } = await params;

  return <AddServerPageClient orgSlug={orgSlug} />;
}
