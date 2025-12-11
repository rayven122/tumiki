"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, Users, TrendingUp, Calendar } from "lucide-react";
import { api } from "@/trpc/react";
type MemberStat = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  requestCount: number;
  lastActivity: number | null;
};

export const UsageStatsSection = () => {
  const { data: usageStats, isLoading } =
    api.organization.getUsageStats.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>使用量統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded bg-gray-200"></div>
              ))}
            </div>
            <div className="h-64 rounded bg-gray-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageStats) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-500">使用量統計を読み込めませんでした。</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "未使用";
    return new Date(timestamp).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>使用量統計（過去30日間）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    総リクエスト数
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {usageStats.totalRequests.toLocaleString()}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    アクティブユーザー
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {usageStats.uniqueUsers}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="rounded-lg bg-purple-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    日平均リクエスト
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {Math.round(usageStats.totalRequests / 30).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 flex items-center text-lg font-semibold">
              <Calendar className="mr-2 h-5 w-5" />
              日別リクエスト数（過去7日間）
            </h4>
            <div className="grid grid-cols-7 gap-2">
              {usageStats.dailyStats.slice(-7).map((stat, index) => {
                const maxRequests = Math.max(
                  ...usageStats.dailyStats.slice(-7).map((s) => s.requests),
                );
                const height =
                  maxRequests > 0 ? (stat.requests / maxRequests) * 100 : 0;

                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="flex h-24 w-full items-end rounded bg-gray-200">
                      <div
                        className="w-full rounded bg-blue-500 transition-all duration-300"
                        style={{ height: `${height}%` }}
                        title={`${stat.requests} リクエスト`}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {stat.date
                        ? new Date(stat.date).toLocaleDateString("ja-JP", {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </div>
                    <div className="text-xs font-medium">{stat.requests}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>メンバー別活動状況</CardTitle>
        </CardHeader>
        <CardContent>
          {usageStats.memberStats.length === 0 ? (
            <p className="py-4 text-center text-gray-500">
              活動データがありません。
            </p>
          ) : (
            <div className="space-y-4">
              {usageStats.memberStats
                .sort(
                  (a: MemberStat, b: MemberStat) =>
                    b.requestCount - a.requestCount,
                )
                .map((memberStat: MemberStat, index: number) => (
                  <div
                    key={memberStat.user.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-500">
                          #{index + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={memberStat.user.image ?? undefined}
                          />
                          <AvatarFallback>
                            {memberStat.user.name?.charAt(0)?.toUpperCase() ??
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <div className="font-medium">
                          {memberStat.user.name ?? "名前未設定"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {memberStat.user.email ?? "メールアドレス未設定"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {memberStat.requestCount} リクエスト
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        最終活動: {formatDate(memberStat.lastActivity)}
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
