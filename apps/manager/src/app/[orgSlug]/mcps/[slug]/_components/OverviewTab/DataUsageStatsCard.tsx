import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";
import type { RequestStats } from "../types";

type DataUsageStatsCardProps = {
  requestStats?: RequestStats;
};

// データサイズをフォーマットする関数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const DataUsageStatsCard = ({
  requestStats,
}: DataUsageStatsCardProps) => {
  const totalInputBytes = requestStats?.totalInputBytes ?? 0;
  const totalOutputBytes = requestStats?.totalOutputBytes ?? 0;
  const totalBytes = totalInputBytes + totalOutputBytes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          データ使用量
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">入力データ:</span>
            <span className="text-lg font-semibold">
              {formatBytes(totalInputBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">出力データ:</span>
            <span className="text-lg font-semibold">
              {formatBytes(totalOutputBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium text-gray-600">合計:</span>
            <span className="text-lg font-semibold text-blue-600">
              {formatBytes(totalBytes)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
