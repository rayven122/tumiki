import { Suspense } from "react";
import { DashboardClient } from "./_components/DashboardClient";
import { Skeleton } from "@tumiki/ui/skeleton";

type DashboardPageProps = {
  params: Promise<{ orgSlug: string }>;
};

const DashboardPage = async ({ params }: DashboardPageProps) => {
  const { orgSlug } = await params;

  return (
    <div className="container mx-auto max-w-screen-2xl px-6 py-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* ヘッダー */}
    <div className="space-y-1">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72" />
    </div>

    {/* プライマリ統計 */}
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-lg" />
        ))}
      </div>
      {/* セカンダリ統計 */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-lg" />
        ))}
      </div>
    </div>

    {/* アクティビティ + サイドバー */}
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[240px] rounded-lg" />
          <Skeleton className="h-[240px] rounded-lg" />
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
    </div>

    {/* 最近の実行履歴 */}
    <Skeleton className="h-64 rounded-lg" />
  </div>
);

export default DashboardPage;
