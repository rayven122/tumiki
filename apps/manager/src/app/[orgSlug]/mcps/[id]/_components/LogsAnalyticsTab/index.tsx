"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import type { RequestLog } from "../types";

type LogsAnalyticsTabProps = {
  requestLogs?: RequestLog[];
};

export const LogsAnalyticsTab = ({ requestLogs }: LogsAnalyticsTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>リクエストログ</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!requestLogs || requestLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm">リクエストログがありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requestLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-semibold">
                          {log.toolName}
                        </span>
                        <Badge
                          variant={
                            log.httpStatus.startsWith("2")
                              ? "default"
                              : "destructive"
                          }
                        >
                          {log.httpStatus}
                        </Badge>
                        <Badge variant="secondary">{log.transportType}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-4">
                        <div>
                          <span className="text-gray-500">メソッド:</span>{" "}
                          {log.method}
                        </div>
                        <div>
                          <span className="text-gray-500">応答時間:</span>{" "}
                          {log.durationMs}ms
                        </div>
                        <div>
                          <span className="text-gray-500">入力:</span>{" "}
                          {Math.round(log.inputBytes / 1024)}KB
                        </div>
                        <div>
                          <span className="text-gray-500">出力:</span>{" "}
                          {Math.round(log.outputBytes / 1024)}KB
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString("ja-JP")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
