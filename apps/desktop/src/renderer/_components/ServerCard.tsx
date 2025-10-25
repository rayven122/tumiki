import React from "react";
import type { McpServer } from "../../shared/types";
import { Play, Square, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

type ServerCardProps = {
  server: McpServer;
  onStart: (serverId: string) => void;
  onStop: (serverId: string) => void;
};

export const ServerCard = ({
  server,
  onStart,
  onStop,
}: ServerCardProps): React.ReactElement => {
  const statusColors = {
    running: "bg-green-100 text-green-800",
    stopped: "bg-gray-100 text-gray-800",
    error: "bg-red-100 text-red-800",
  };

  const handleToggle = (): void => {
    if (server.status === "running") {
      onStop(server.id);
    } else {
      onStart(server.id);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {server.name}
            </h3>
            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusColors[server.status],
              )}
            >
              {server.status === "running" && "起動中"}
              {server.status === "stopped" && "停止中"}
              {server.status === "error" && "エラー"}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{server.description}</p>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-gray-500">
              <span className="font-medium">コマンド:</span> {server.command}
            </p>
            {server.args.length > 0 && (
              <p className="text-xs text-gray-500">
                <span className="font-medium">引数:</span>{" "}
                {server.args.join(" ")}
              </p>
            )}
          </div>
        </div>
        <div className="ml-4 flex flex-col items-end space-y-2">
          <button
            onClick={handleToggle}
            disabled={server.status === "error"}
            className={clsx(
              "flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              server.status === "running"
                ? "bg-red-600 text-white hover:bg-red-700"
                : server.status === "error"
                  ? "cursor-not-allowed bg-gray-300 text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700",
            )}
          >
            {server.status === "running" ? (
              <>
                <Square size={16} />
                <span>停止</span>
              </>
            ) : server.status === "error" ? (
              <>
                <AlertCircle size={16} />
                <span>エラー</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>起動</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
