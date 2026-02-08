import { Suspense } from "react";
import { SchedulePageClient } from "./_components/SchedulePageClient";
import { Loader2 } from "lucide-react";

type SchedulePageProps = {
  params: Promise<{
    orgSlug: string;
    id: string;
  }>;
};

const SchedulePage = async ({ params }: SchedulePageProps) => {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <SchedulePageClient agentId={id} />
    </Suspense>
  );
};

export default SchedulePage;
