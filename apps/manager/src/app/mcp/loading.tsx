import { UserMcpServerCardSkeleton } from "./(index)/@tabs/_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Tabs skeleton */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Server cards grid skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <UserMcpServerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
