import { cn } from "@/lib/utils";
import { ServerStatus } from "@tumiki/db/prisma";
import { SERVER_STATUS_LABELS } from "@/features/mcps/constants/userMcpServer";

type ServerStatusBadgeProps = {
  serverStatus: ServerStatus;
  className?: string;
};

export const ServerStatusBadge = ({
  serverStatus,
  className,
}: ServerStatusBadgeProps) => {
  const statusColors = {
    [ServerStatus.RUNNING]: "bg-green-500",
    [ServerStatus.STOPPED]: "bg-gray-500",
    [ServerStatus.PENDING]: "bg-yellow-500",
    [ServerStatus.ERROR]: "bg-red-500",
  } as const;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn("h-2 w-2 rounded-full", statusColors[serverStatus])}
        aria-hidden="true"
      />
      <span className="text-xs text-gray-600">
        {SERVER_STATUS_LABELS[serverStatus]}
      </span>
    </div>
  );
};
