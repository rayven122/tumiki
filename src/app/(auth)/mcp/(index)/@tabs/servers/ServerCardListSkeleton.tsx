import { UserMcpServerCardSkeleton } from "../../../_components/UserMcpServerCard/UserMcpServerCardSkeleton";

export function ServerCardListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <UserMcpServerCardSkeleton key={i} />
      ))}
    </div>
  );
}
