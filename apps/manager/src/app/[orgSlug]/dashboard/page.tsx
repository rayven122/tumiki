import { Suspense } from "react";
import { DashboardClient } from "./_components/DashboardClient";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardPageProps = {
  params: Promise<{ orgSlug: string }>;
};

const DashboardPage = async ({ params }: DashboardPageProps) => {
  const { orgSlug } = await params;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* ヘッダー */}
    <Skeleton className="h-8 w-48" />

    {/* 統計カード */}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>

    {/* 稼働中エージェント */}
    <Skeleton className="h-48 rounded-lg" />

    {/* 最近の実行履歴 */}
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  </div>
);

export default DashboardPage;
